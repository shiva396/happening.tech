"""Bake the atlas surface and matching first-frame poster. Run with Python + Pillow."""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2] / 'web'
ART = ROOT / 'art'
W, H = 4096, 2048
topology = json.loads((ART / 'countries.json').read_text())
transform = topology['transform']
arcs = []
for arc in topology['arcs']:
    x = y = 0
    points = []
    for dx, dy in arc:
        x, y = x + dx, y + dy
        lon = x * transform['scale'][0] + transform['translate'][0]
        lat = y * transform['scale'][1] + transform['translate'][1]
        points.append(((lon + 180) * W / 360, (90 - lat) * H / 180))
    arcs.append(points)

mask = Image.new('L', (W, H))
borders = mask.copy()
landpen, borderpen = ImageDraw.Draw(mask), ImageDraw.Draw(borders)
for country in topology['objects']['countries']['geometries']:
    polygons = country['arcs'] if country['type'] == 'MultiPolygon' else [country['arcs']]
    for polygon in polygons:
        for ring_no, ring in enumerate(polygon):
            points = []
            for arc in ring:
                section = arcs[arc] if arc >= 0 else arcs[~arc][::-1]
                points.extend(section if not points else section[1:])
            # Unwrap rings that cross the date line before drawing periodic copies.
            unwrapped = [points[0]]
            for x, y in points[1:]:
                previous = unwrapped[-1][0]
                unwrapped.append((x + W * round((previous-x)/W), y))
            for shift in (-W,0,W):
                line = [(x+shift,y) for x,y in unwrapped]
                fill = line
                if abs(line[-1][0]-line[0][0]) > W/2:
                    # The Antarctic coastline encloses the south pole.
                    fill = [*line, (line[-1][0],H), (line[0][0],H)]
                landpen.polygon(fill, fill=255 if ring_no == 0 else 0)
                borderpen.line(line, fill=255, width=2, joint='curve')

# Keep real mountain relief and ocean-floor detail, recoloured to the atlas palette.
relief = Image.open(ART / 'earth-relief.webp').convert('L').resize((W,H), Image.Resampling.BICUBIC)
relief = ImageChops.add(ImageChops.subtract(relief, relief.filter(ImageFilter.GaussianBlur(4)), offset=128),
                         ImageChops.subtract(relief, relief.filter(ImageFilter.GaussianBlur(17)), offset=0))
ocean = ImageOps.colorize(relief, (18,114,183), (106,196,235), (52,161,222))
land = ImageOps.colorize(relief, (115,169,187), (247,253,251), (211,233,236))
coast_shadow = ImageChops.offset(mask, 2, 4).filter(ImageFilter.GaussianBlur(3))
ocean.paste((32,131,188), mask=coast_shadow.point(lambda x: int(x*.84)))
ground = Image.composite(land, ocean, mask)
# Define the elevated edge of each shore and delicate political boundaries.
edge = ImageChops.subtract(mask, ImageChops.offset(mask, 1, 2))
ground.paste((245,255,255), mask=edge.point(lambda x: round(x*.72)))
ground.paste((113,169,190), mask=borders.point(lambda x: round(x*.63)))
grid = Image.new('L', (W,H))
pen = ImageDraw.Draw(grid)
for lon in range(-180,180,15):
    x = (lon+180)*W/360
    pen.line([(x,0),(x,H)], fill=40, width=1)
for lat in range(-75,90,15):
    y = (90-lat)*H/180
    pen.line([(0,y),(W,y)], fill=40, width=1)
ground.paste((226,252,255), mask=grid)
ground = ground.resize((3072,1536), Image.Resampling.LANCZOS)
ground.save(ART / 'world-surface.webp', quality=86, method=6)

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
globe.save(ART / 'world-poster.webp', quality=88, method=6)
