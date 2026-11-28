"""Bake the globe from the NASA Blue Marble JPEG listed in web/vendor/globe/LICENSE.txt."""
import argparse
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageStat

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('satellite', type=Path)
source_path = parser.parse_args().satellite
ART = Path(__file__).resolve().parents[2] / 'web/art'
TILE = 672
Image.MAX_IMAGE_PIXELS = 240_000_000

out = ART / 'world-detail'
out.mkdir(exist_ok=True)
with Image.open(source_path) as source:
    if source.size != (21600, 10800):
        raise ValueError('Expected the 21600 × 10800 August Blue Marble mosaic')
    overview = source.resize((2048, 1024), Image.Resampling.LANCZOS)
    overview.save(ART / 'world-surface.webp', quality=79, method=6)
    overview.save(ART / 'world-surface.avif', quality=54, speed=5, max_threads=3)
    # Encode textured land more faithfully than smooth ocean at the same resolution.
    # The intermediate level remains WebP for renderers without an AVIF decoder.
    def encode_tile(job):
        index, box, fine = job
        tile = source.resize((TILE, TILE), Image.Resampling.LANCZOS, box=box)
        luma = tile.convert('L')
        contrast = ImageStat.Stat(ImageChops.difference(luma, luma.filter(ImageFilter.BoxBlur(1)))).mean[0]
        if fine:
            quality = min(73, round(50 + 3.5 * contrast))
            tile.save(out / f'{index}.avif', quality=quality, speed=5, max_threads=1)
        else:
            quality = min(80, round(74 + contrast))
            tile.save(out / f'{index}.webp', quality=quality, method=6)

    jobs = []
    for cols, rows in [(16, 8), (32, 16)]:
        for row in range(rows):
            for col in range(cols):
                box = (col * source.width / cols, row * source.height / rows,
                       (col + 1) * source.width / cols, (row + 1) * source.height / rows)
                jobs.append((len(jobs), box, cols == 32))
    # Load the source once before sharing its read-only pixels between encoders.
    source.load()
    with ThreadPoolExecutor(max_workers=4) as workers:
        list(workers.map(encode_tile, jobs))

# Same inverse orthographic projection and directional light as surface.js.
size = 896
globe = Image.new('RGBA', (size,size))
pixels = globe.load()
ground = Image.open(ART / 'world-surface.webp').convert('RGB')
surface = ground.load()
w,h = ground.size
north, east = map(math.radians, (25,42))
sn,cs = math.sin(north), math.cos(north)
for row in range(size):
    y = 1-2*(row+.5)/size
    for col in range(size):
        x = 2*(col+.5)/size-1
        d = 1-x*x-y*y
        if d < 0: continue
        z = math.sqrt(d)
        lon = math.atan2(x, z*cs-y*sn) + east
        lat = math.asin(max(-1,min(1,y*cs+z*sn)))
        u,v = (lon/(2*math.pi)+.5)%1, .5-lat/math.pi
        rgb = surface[min(w-1,int(u*w)),min(h-1,int(v*h))]
        light = .89+.16*max(-.5,-.41*x+.52*y+.75*z)
        rim = .33*(1-z)**6
        shade = [round(max(0,min(255,c*light*(1-rim)+r*rim))) for c,r in zip(rgb,(117,180,235))]
        alpha = round(min(1,d*size/3)*255)
        pixels[col,row] = (*shade,alpha)
globe.save(ART / 'world-poster.webp', quality=80, method=6)
globe.save(ART / 'world-poster.avif', quality=55, speed=5, max_threads=3)
