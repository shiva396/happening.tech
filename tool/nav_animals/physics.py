"""Bake projectile arcs, elastic landings and pendulum motion into dotLottie v1 clips."""
import base64
import json
import math
from pathlib import Path
import sys
from zipfile import ZipFile, ZIP_DEFLATED

HERE = Path(__file__).resolve().parent
DEST = HERE.parent.parent / 'web' / 'motion' / 'animals'
FPS = 30
POSES = 24
def still(value):
    return {'a': 0, 'k': value}

def track(samples, key):
    # Linear interpolation between integrated samples avoids double-easing gravity.
    frames = []
    for i, sample in enumerate(samples):
        value = sample[key]
        value = value if isinstance(value, list) else [value]
        frames.append({'t': i, 's': [round(x, 3) for x in value]})
        if i + 1 < len(samples):
            frames[-1].update(i={'x':[1],'y':[1]}, o={'x':[0],'y':[0]})
    return {'a': 1, 'k': frames}

def sample(x, y, depth, compression, angle, phase, floor, profile, front):
    size = (84 + 16 * depth) * profile['size']
    altitude = max(0, floor - y)
    return dict(pos=[x,y], scale=[size*(1+compression),size*(1-compression)], rotation=angle,
                pose=int(phase*POSES)%POSES, front=front,
                shadow=[x,floor+24], spread=[100+altitude*.65,100+altitude*.4],
                opacity=max(4,22-altitude*.34))

def hop(profile):
    # Each take starts and ends at the same foothold and depth.
    points = [(45,68,-.24),(95,68,-.5),(158,82,.85),(45,68,-.24)]
    take = []
    stance = round(profile['stance']*FPS)
    for i,seconds in enumerate(profile['flights']):
        start, stop = points[i:i+2]
        flight = round(seconds*FPS)
        duration = flight/FPS
        for f in range(stance+flight):
            if f < stance:
                t = f/stance
                # Underdamped contact response followed by anticipation of take-off.
                compression = profile['softness']*(math.exp(-4*t)*math.sin(3*math.pi*t)+.65*math.sin(math.pi*t)**2)
                u, rise, angle = 0, 0, 2*math.sin(2*math.pi*t)
            else:
                u = (f-stance)/flight
                rise = .5*profile['g']*duration**2*u*(1-u)
                compression = -.052*math.sin(math.pi*u)
                angle = math.copysign(1,stop[0]-start[0])*math.sin(2*math.pi*u)*min(28,profile['roll']*.24+8)
            x, floor, depth = (a+(b-a)*u for a,b in zip(start,stop))
            phase = f/(stance+flight)
            take.append(sample(x,floor-rise+compression*17,depth,compression,angle,phase,floor,profile,depth>.15))
    return take

def swing(profile):
    # Integrate a nonlinear pendulum with velocity Verlet. Capture one return to the
    # launch extremum, then sample the periodic trajectory at the playback frame rate.
    angle = -math.radians(profile['swing'])
    velocity = 0
    length = 58
    dt = 1/240
    acc = lambda theta: -profile['g']/length*math.sin(theta)
    history = []
    while len(history)<2400:
        history.append((angle,velocity))
        next_angle = angle + velocity*dt + .5*acc(angle)*dt*dt
        next_velocity = velocity + .5*(acc(angle)+acc(next_angle))*dt
        if velocity<0<=next_velocity: break
        angle,velocity=next_angle,next_velocity
    count=round(len(history)*dt*FPS)
    take=[]
    for f in range(count):
        phase=f/count
        theta,speed=history[int(phase*len(history))]
        depth=-math.sin(2*math.pi*phase)
        x=104+length*math.sin(theta)
        y=34+length*math.cos(theta)+12*depth
        tilt=math.degrees(theta)*.37+profile['roll']*math.sin(2*math.pi*phase)**3
        stretch=-min(.045,.004*abs(speed))
        take.append(sample(x,y,depth,stretch,tilt,phase,109,profile,phase>.5))
    return take

def bake(name, profile, directory):
    takes={'hop':hop(profile),'orbit':swing(profile)}
    frames=[frame for take in takes.values() for frame in take]
    total=len(frames)
    base=dict(ddd=0,sr=1,st=0,ao=0,bm=0)
    identity=dict(p=still([0,0]),a=still([0,0]),r=still(0),o=still(100),s=still([100,100]))
    assets, layers, markers = [], [], []
    transform=dict(identity,p=track(frames,'pos'),s=track(frames,'scale'),r=track(frames,'rotation'))
    layers.append(dict(base,ind=1,ty=3,nm='Centre of mass',ks=transform,ip=0,op=total))
    offset=0
    for mode,take in takes.items():
        foreground=[i for i,frame in enumerate(take) if frame['front']]
        markers.extend([dict(cm=mode,tm=offset,dr=len(take)),
                        dict(cm=mode+'-front',tm=offset+foreground[0],dr=foreground[-1]-foreground[0]+1)])
        # Reuse each pose across strides and hold it until the next distinct pose.
        pose_ids=set()
        start=0
        while start<len(take):
            pose=take[start]['pose']
            end=start+1
            while end<len(take) and take[end]['pose']==pose: end+=1
            key=f'{mode}-{pose}'
            if key not in pose_ids:
                data=(directory/f'{name}-{key}.png').read_bytes()
                encoded=base64.b64encode(data).decode()
                pose_ids.add(key)
                assets.append(dict(id=key,w=144,h=144,u='',p='data:image/png;base64,'+encoded,e=1))
            layers.append(dict(base,ind=len(layers)+1,ty=2,parent=1,refId=key,nm=key,
                               ks=dict(identity,a=still([72,72])),ip=offset+start,op=offset+end))
            start=end
        offset+=len(take)
    shadow=dict(identity,p=track(frames,'shadow'),s=track(frames,'spread'),o=track(frames,'opacity'))
    layers.append(dict(base,ind=len(layers)+1,ty=4,nm='Contact shadow',ks=shadow,ip=0,op=total,
        shapes=[dict(ty='el',d=1,p=still([0,0]),s=still([42,5])),dict(ty='fl',c=still([.39,.32,.47]),o=still(100),r=1)]))
    animation=dict(v='5.9.0',fr=FPS,ip=0,op=total,w=220,h=140,nm=name,ddd=0,assets=assets,layers=layers,markers=markers)
    with ZipFile(DEST/(name+'.lottie'),'w',ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json',json.dumps({'version':'1.0','animations':[{'id':name}]}))
        archive.writestr('animations/'+name+'.json',json.dumps(animation,separators=(',',':')))

if __name__=='__main__':
    DEST.mkdir(parents=True,exist_ok=True)
    for animal,profile in json.loads((HERE/'cast.json').read_text()).items():
        bake(animal,profile,Path(sys.argv[1]))
