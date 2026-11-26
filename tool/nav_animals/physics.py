"""Bake each ten-second performance and its contact anchors for responsive type."""
import base64
import json
import math
from pathlib import Path
import sys
from zipfile import ZipFile, ZIP_DEFLATED

DEST = Path(__file__).resolve().parents[2] / 'web/motion/animals'
FPS = 15
FRAMES = 10 * FPS

def between(t, start, end):
    return max(0, min(1, (t - start) / (end - start)))

def ease(u):
    return u * u * (3 - 2 * u)

def mix(a, b, u):
    return a + (b - a) * u

def position(t, animal, pose):
    monkey = animal == 'monkey'
    entry, launch, perch, exit_x = (-.18, .23, .57, 1.00) if monkey else (1.00, .71, .20, -.13)
    foot, grip, seat = (pose[key] for key in ('foot', 'grip', 'seat'))
    # x in label widths, y between the top of the ink (0) and the bottom
    # border (1), plus an offset in sprite widths. Contacts survive resizing.
    if t < .86:
        u = ease(between(t, 0, .86))
        peek = 0 if monkey else .075 * math.sin(2 * math.pi * u)
        return [entry, 1, mix(.02, -foot, u) + peek]
    if t < 2.82:
        u = ease(between(t, .86, 2.56))
        return [mix(entry, launch, u), 1, -foot]
    if t < 3.38:
        u = between(t, 2.82, 3.38)
        # Ballistic flight, ending at the catching wrist instead of at the feet.
        return [mix(launch, perch, u), 1-u, -mix(foot, grip, u) - .70*u*(1-u)]
    if t < 3.98:
        dt = t - 3.38
        swing = (.045 if monkey else -.06) * math.exp(-5*dt)*math.sin(12*dt)
        return [perch+swing, 0, -grip]
    if t < 4.74:
        u = ease(between(t, 3.98, 4.74))
        return [perch, 0, -mix(grip, seat, u)]
    if t < 8.70:
        return [perch, 0, -seat]
    u = between(t, 8.70, 9.96)
    return [mix(perch, exit_x, u), u, mix(-seat, .09, u) - 1.35*u*(1-u)]

def pack(animal, directory):
    poses = json.loads((directory / (animal+'.json')).read_text())
    manifest = dict(version='1.0', animations=[{'id': name} for name in ('body','paws')])
    with ZipFile(DEST / (animal+'.lottie'), 'w', ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(manifest))
        for plane in ('body','paws'):
            assets, layers = [], []
            for i, pose in enumerate(poses):
                frame = pose.get(plane)
                if not frame:
                    continue
                data = (directory / frame['file']).read_bytes()
                ref = str(i)
                assets.append(dict(id=ref, w=frame['width'], h=frame['height'], u='', e=1,
                                   p='data:image/png;base64,'+base64.b64encode(data).decode()))
                fixed = lambda v: {'a':0,'k':v}
                transform = dict(a=fixed([0,0]), p=fixed([frame['left'],frame['top']]),
                                 s=fixed([100,100]), r=fixed(0), o=fixed(100))
                layers.append(dict(ind=i+1, ty=2, refId=ref, sr=1, ks=transform, ip=i*2,
                                   op=(i+1)*2, st=0, bm=0, ao=0, ddd=0))
            clip = dict(v='5.9.0', nm=animal+' '+plane, fr=30, ip=0, op=FRAMES*2,
                        w=144, h=144, ddd=0, assets=assets, layers=layers)
            archive.writestr('animations/'+plane+'.json', json.dumps(clip,separators=(',',':')))
    return [[round(value,5) for value in position(i/FPS,animal,pose)] for i,pose in enumerate(poses)]

if __name__=='__main__':
    DEST.mkdir(exist_ok=True, parents=True)
    paths={name:pack(name,Path(sys.argv[1])) for name in ('monkey','koala')}
    (DEST/'paths.json').write_text(json.dumps(paths,separators=(',',':'))+'\n')
