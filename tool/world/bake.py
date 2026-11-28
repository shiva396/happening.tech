"""Build the overview, poster and regional zoom tiles from Natural Earth 1:10m sources.

Pass the source directory described in web/vendor/globe/LICENSE.txt. Requires Pillow.
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('sources', type=Path)
src = parser.parse_args().sources
ART = Path(__file__).resolve().parents[2] / 'web/art'
TILE = 768
COLS, ROWS = 16, 8
W, H = COLS * TILE, ROWS * TILE
Image.MAX_IMAGE_PIXELS = 300_000_000  # The original Natural Earth raster is 21,600 x 10,800.


def shapes(name):
    for feature in json.loads((src / (name + '.geojson')).read_text())['features']:
        geom = feature['geometry']
        if geom['type'].startswith('Multi'):
            yield from geom['coordinates']
        else:
            yield geom['coordinates']


def project(ring):
    return [((lon + 180) * W / 360, (90 - lat) * H / 180) for lon, lat in ring]


mask = Image.new('L', (W, H))
pen = ImageDraw.Draw(mask)
# Natural Earth's GeoJSON polygons are already split at the antimeridian.
for polygon in shapes('countries'):
    for index, ring in enumerate(polygon):
        pen.polygon(project(ring), fill=0 if index else 255)
for polygon in shapes('lakes'):
    for index, ring in enumerate(polygon):
        pen.polygon(project(ring), fill=255 if index else 0)
borders = Image.new('L', (W, H))
pen = ImageDraw.Draw(borders)
for line in shapes('admin_0_boundary_lines_land'):
    pen.line(project(line), fill=180, width=2, joint='curve')

with Image.open(src / 'relief.tif') as source:
    relief = source.convert('L').resize((W, H), Image.Resampling.LANCZOS)

# Apply relief and coastline shading with neighboring pixels across tile boundaries.
# Padding wraps across longitude and repeats the polar rows.
def padded(layer, x, y, margin):
    xx, yy = x*TILE-margin, y*TILE-margin
    size = TILE + 2*margin
    available = (xx, max(0, yy), xx+size, min(H, yy+size))
    tile = layer.crop(available)
    if xx < 0:
        tile.paste(layer.crop((W+xx, available[1], W, available[3])), (0, 0))
    if xx+size > W:
        tile.paste(layer.crop((0, available[1], xx+size-W, available[3])), (W-xx, 0))
    if tile.height == size:
        return tile
    result = Image.new('L', (size, size))
    offset = max(0, -yy)
    result.paste(tile, (0, offset))
    if offset:
        result.paste(tile.crop((0, 0, size, 1)).resize((size, offset)), (0, 0))
    else:
        result.paste(tile.crop((0, tile.height-1, size, tile.height)).resize((size, size-tile.height)), (0, tile.height))
    return result


out = ART / 'world-detail'
out.mkdir(exist_ok=True)
overview_tile = 128
overview = Image.new('RGB', (COLS*overview_tile, ROWS*overview_tile))
margin = 48
for y in range(ROWS):
    for x in range(COLS):
        heights = padded(relief, x, y, margin)
        land = padded(mask, x, y, margin)
        high = ImageChops.subtract(heights, heights.filter(ImageFilter.GaussianBlur(12)), offset=128)
        high = high.point(lambda v: max(0, min(255, 128 + (v-128)*2.5)))
        sea = ImageOps.colorize(high, (17,103,168), (113,203,236), (52,161,222))
        soil = ImageOps.colorize(high, (82,140,158), (250,253,247), (211,233,236))
        shadow = ImageChops.offset(land, 2, 4).filter(ImageFilter.GaussianBlur(3))
        sea.paste((30,132,188), mask=shadow.point(lambda v: int(v*.75)))
        tile = Image.composite(soil, sea, land)
        coast = ImageChops.subtract(land, ImageChops.offset(land, 1, 2))
        tile.paste((245,255,255), mask=coast)
        tile.paste((106,160,177), mask=padded(borders, x, y, margin))
        tile = tile.crop((margin, margin, TILE+margin, TILE+margin))
        grid = Image.new('L', tile.size)
        gridpen = ImageDraw.Draw(grid)
        for k in range(-180,180,15):
            u = (k+180)*W/360-x*TILE
            if 0 <= u < TILE: gridpen.line((u,0,u,TILE), fill=58, width=2)
        for k in range(-75,90,15):
            v = (90-k)*H/180-y*TILE
            if 0 <= v < TILE: gridpen.line((0,v,TILE,v), fill=58, width=2)
        tile.paste((226,251,255), mask=grid)
        tile.save(out / f'{y*COLS+x}.webp', quality=89, method=4)
        overview.paste(tile.resize((overview_tile, overview_tile), Image.Resampling.LANCZOS),
                       (x*overview_tile, y*overview_tile))
overview.save(ART / 'world-surface.webp', quality=80, method=6)

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
        light = .70+.34*max(-.45,-.41*x+.52*y+.75*z) + .045*z
        rim = .44*(1-z)**5
        shade = [round(max(0,min(255,c*light*(1-rim)+r*rim))) for c,r in zip(rgb,(144,218,249))]
        alpha = round(min(1,d*size/3)*255)
        pixels[col,row] = (*shade,alpha)
globe.save(ART / 'world-poster.webp', quality=80, method=6)
