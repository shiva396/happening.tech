"""Build Namma Dash as a self-contained glTF 2.0 model, using only Python's stdlib."""
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUFFER = bytearray()
SCENE = {
    "asset": {"version": "2.0", "generator": "flutter.spot / Namma Flutter"},
    "extensionsUsed": ["KHR_mesh_quantization"],
    "extensionsRequired": ["KHR_mesh_quantization"],
    "scene": 0, "scenes": [{"name": "Namma Dash", "nodes": []}],
    "nodes": [], "meshes": [], "materials": [], "accessors": [], "bufferViews": [],
}
GEOMETRY = {}
MESHES = {}
MATERIALS = {}


QUANTIZATION = 16384
INDEX_ACCESSORS = {}


def values(items, component, shape):
    # glTF vertex elements are four-byte aligned. Quantized positions and
    # smooth normals together occupy 12 bytes instead of six 32-bit floats.
    width = 1 if shape == "SCALAR" else 3
    code, char, pad = {"POSITION": (5122, "h", 2), "NORMAL": (5120, "b", 1),
                       "INDEX": (5123, "H", 0)}[component]
    if component == "POSITION":
        items = [round(x*QUANTIZATION) for x in items]
    elif component == "NORMAL":
        items = [round(x*127) for x in items]
    while len(BUFFER) % 4:
        BUFFER.append(0)
    if width == 1:
        packed = struct.pack(f"<{len(items)}{char}", *items)
    else:
        element = struct.Struct(f"<3{char}{pad}x")
        packed = b"".join(element.pack(*items[i:i+width]) for i in range(0, len(items), width))
    views = SCENE["bufferViews"]
    view = {"buffer": 0, "byteOffset": len(BUFFER), "byteLength": len(packed),
            "target": 34963 if width == 1 else 34962}
    if width > 1:
        view["byteStride"] = struct.calcsize(char)*width + pad
    views.append(view)
    BUFFER.extend(packed)
    acc = {"bufferView": len(views)-1, "componentType": code, "type": shape,
           "count": len(items) // width, "min": [min(items[i::width]) for i in range(width)],
           "max": [max(items[i::width]) for i in range(width)]}
    if component == "NORMAL":
        acc["normalized"] = True
    SCENE["accessors"].append(acc)
    return len(SCENE["accessors"])-1


def unit(v):
    length = math.sqrt(sum(x*x for x in v))
    return tuple(x/length for x in v) if length else (0, 0, 1)


def geometry(name, sample, rows=20, columns=32, periodic=True):
    """Sample a smooth surface. Duplicate the seam to preserve its normals."""
    points, normals, indices = [], [], []
    for r in range(rows + 1):
        for c in range(columns + 1):
            u, v = c/columns, r/rows
            points.extend(sample(u, v))
            # Move just inside a collapsed pole for a defined tangent.
            v = min(.99997, max(.00003, v))
            delta = .00001
            left = sample(u-delta if periodic else max(0, u-delta), v)
            right = sample(u+delta if periodic else min(1, u+delta), v)
            low, high = sample(u, v-delta), sample(u, v+delta)
            a = [b-a for a, b in zip(left, right)]
            b = [b-a for a, b in zip(low, high)]
            normals.extend(unit((a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])))
            if r < rows and c < columns:
                i = r*(columns+1)+c
                indices.extend((i, i+1, i+columns+1, i+1, i+columns+2, i+columns+1))
    topology = (rows, columns)
    if topology not in INDEX_ACCESSORS:
        INDEX_ACCESSORS[topology] = values(indices, "INDEX", "SCALAR")
    GEOMETRY[name] = {"attributes": {"POSITION": values(points, "POSITION", "VEC3"),
                                      "NORMAL": values(normals, "NORMAL", "VEC3")},
                      "indices": INDEX_ACCESSORS[topology]}


def orb(taper=0, sweep=0):
    def sample(u, v):
        a, b = math.tau*u, math.pi*v
        y = -math.cos(b)
        w = math.sin(b)*(1-taper*y)
        return w*math.sin(a)+sweep*y*y, y, w*math.cos(a)
    return sample


def mat(name, hex_color, roughness=.55, metallic=0):
    srgb = [int(hex_color[i:i+2], 16)/255 for i in (0, 2, 4)]
    linear = [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in srgb]
    MATERIALS[name] = len(SCENE["materials"])
    SCENE["materials"].append({"name": name, "pbrMetallicRoughness": {
        "baseColorFactor": [*linear, 1], "roughnessFactor": roughness, "metallicFactor": metallic,
    }})


def node(name, shape, material, pos=(0, 0, 0), scale=(1, 1, 1), roll=0, part="body", yaw=0):
    key = shape, material
    if key not in MESHES:
        MESHES[key] = len(SCENE["meshes"])
        SCENE["meshes"].append({"name": f"{shape} / {material}", "primitives": [
            {**GEOMETRY[shape], "material": MATERIALS[material]}]})
    # Intrinsic rotations about the local Z axis and then the world Y axis.
    a, b = math.radians(roll)/2, math.radians(yaw)/2
    rotation = [math.sin(b)*math.sin(a), math.sin(b)*math.cos(a),
                math.cos(b)*math.sin(a), math.cos(b)*math.cos(a)]
    SCENE["scenes"][0]["nodes"].append(len(SCENE["nodes"]))
    SCENE["nodes"].append({"name": name, "mesh": MESHES[key], "translation": pos,
                           "scale": [s/QUANTIZATION for s in scale],
                           "rotation": rotation, "extras": {"part": part}})


def face(u, v):
    # A single continuous twin-lobed mask draped over the curvature of the head.
    a = math.tau*u
    x = .483*v*math.sin(a)
    y = (.160 + .240*math.sin(a)**2)*v*math.cos(a)
    y += 1.238
    z = .515*math.sqrt(max(.001, 1-(x/.646)**2-((y-1.087)/.661)**2))
    z += .012 + .044*math.sqrt(max(0, 1-v*v))
    return x, y, z


def belt(u, v):
    a = math.tau*u
    # Fine pleating across a slightly flared silk waist wrap.
    w = .390 + .047*(1-v) + .008*math.cos((v*2.5+.36*math.sin(a-.22)+.18*math.cos(a*2.0))*math.tau)
    w += .0035*math.sin(5*a + 1.3*v)
    return w*math.sin(a), .285+.295*v+.029*math.sin(a+.32), .80*w*math.cos(a)


def selvedge(height):
    def sample(u, v):
        a, b = math.tau*u, math.tau*v
        start = belt(u, height)
        return (start[0]+.0045*math.sin(a)*math.cos(b),
                start[1]+.0035*math.sin(b),
                start[2]+.0045*math.cos(a)*math.cos(b))
    return sample


def beak(lower=False):
    # Broad, domed upper beak, elliptical smile line and smaller lower bill.
    def sample(u, v):
        a, b = -math.tau*u, math.pi*v
        front = (1-math.cos(b))*.5
        rim = math.sin(b)
        x = (.113 if lower else .134)*rim*math.sin(a)*(1-.32*front)
        y = (.079 if lower else .122)*rim*math.cos(a)
        if lower:
            y = min(y, y*.18) + .994 - .003*front
        else:
            y = max(y, y*.12) + 1.011 - .013*front
        return x, y, .446 + (.215 if lower else .249)*front
    return sample


def build():
    geometry("round", orb())
    geometry("plume", orb(.25, .085))
    geometry("silk", belt, 40, 48)
    geometry("border", selvedge(.09), 8, 48)
    geometry("upper bill", beak(), 20)
    geometry("lower bill", beak(True), 18)
    geometry("mask", face, 18, 56)
    for name, color, roughness, metal in [
        ("glacier plumage", "9EE8F6", .79, 0), ("turquoise", "08BCE9", .55, 0),
        ("sky blue", "22CDEA", .64, 0),
        ("iris", "2F7564", .36, 0), ("pupil", "16252D", .19, 0),
        ("catchlight", "FFFFFF", .25, 0), ("bill", "62463F", .65, 0),
        ("lower bill", "49332F", .63, 0), ("bronze feet", "634832", .7, 0),
        ("ivory cotton", "F6EBDD", .87, 0), ("shot silk", "DEAC55", .38, .40),
        ("selvedge", "FADE93", .36, .45), ("ochre folds", "C68D37", .43, .26),
    ]:
        mat(name, color, roughness, metal)
    # Short legs and paired toes peek out from beneath the traditional wrap.
    for sign in (-1, 1):
        x = sign*.233
        node("ankle", "round", "bronze feet", (x,.155,.023), (.072,.107,.073))
        node("foot", "round", "bronze feet", (x,.086,.063), (.132,.059,.131), yaw=sign*10)
        for toe in (0, 1):
            node("toe", "round", "bronze feet", (x+.058*(toe-.5),.071,.145),
                 (.062,.042,.091), yaw=sign*(toe+1)*6)
    node("veshti", "round", "ivory cotton", (0,.348,0), (.399,.229,.333))
    node("silk wrap", "silk", "shot silk")
    node("woven border", "border", "selvedge")
    node("wrap knot", "round", "ochre folds", (-.407,.44,-.005), (.082,.08,.109), -25)
    for i, angle in enumerate((-61, -33)):
        node("knotted end", "plume", "shot silk", (-.445+.015*i,.405+.028*i,.018*i),
             (.057,.13,.065), angle)
    node("head", "round", "glacier plumage", (0,1.087,0), (.646,.661,.515))
    for j, (x,y,z,angle,size) in enumerate([
        (.414,1.513,-.22,-34,.22), (.006,1.730,-.040,-54,.151), (-.035,1.841,.005,-34,.195)
    ]):
        node("crest feather", "plume", "sky blue" if j==2 else "turquoise",
             (x,y,z), (.115,size,.091), angle)
    for side, label in ((-1, "left"),(1,"right")):
        raised = side == -1
        node("wing root", "round", "turquoise",
             (side*.58,1.153 if raised else .983,.026),
             (.182,.175,.177), part=label)
        feathers = [
            (-.728,1.385,-.04,40,.235),(-.786,1.286,.012,61,.198),(-.798,1.202,.068,75,.183)
        ] if raised else [
            (.810,.854,-.052,29,.232),(.758,.843,.042,18,.226),(.687,.874,.145,8,.226)
        ]
        for i, (x,y,z,angle,size) in enumerate(feathers):
            node(f"{label} wing feather {i+1}", "plume", ("turquoise","turquoise","sky blue")[i],
                 (x,y,z),(.112,size,.09), angle if raised else angle+180, part=label)
    node("facial plumage", "mask", "turquoise")
    for s in (-1,1):
        x = s*.25
        for name, material, dims, z in [
            ("iris","iris",(.117,.150,.048),.532),
            ("eye","pupil",(.102,.132,.044),.555),
        ]:
            node(name,"round",material,(x,1.249,z),dims,yaw=s*17,part="eyes")
        node("catchlight", "round", "catchlight", (x-.027,1.300,.596+s*.003),
             (.027,.029,.014), yaw=s*12, part="eyes")
    node("lower beak","lower bill","lower bill")
    node("upper beak","upper bill","bill")


def export():
    SCENE["buffers"] = [{"byteLength": len(BUFFER)}]
    tree = json.dumps(SCENE, separators=(",", ":")).encode()
    tree += b" "*(-len(tree)%4)
    BUFFER.extend(b"\x00"*(-len(BUFFER)%4))
    chunks = struct.pack("<I4s",len(tree),b"JSON")+tree+struct.pack("<I4s",len(BUFFER),b"BIN\x00")+BUFFER
    target = ROOT / "web/art/dash.glb"
    target.write_bytes(struct.pack("<4sII",b"glTF",2,len(chunks)+12)+chunks)
    print(f"{target.name} • {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
    export()
