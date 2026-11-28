import { DASH_MOTION, REST_POSE } from './behaviour.js';

// The model has flat, named rigid parts with shared sphere/feather geometry.
// Batch the glTF primitives once. Posing a wing then costs a uniform update.
const VERTEX = `
attribute vec3 aPosition, aNormal, aColor;
attribute vec3 aSurface;
uniform vec4 uPose;
uniform vec3 uGesture;
varying vec3 vNormal, vRest, vColor;
varying vec2 vMaterial;
mat2 turn(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c,s,-s,c);
}
void main() {
  vec3 p = aPosition;
  vec3 n = aNormal;
  float part = aSurface.z;
  if (part > 2.5) {
    p.y = 1.249 + (p.y - 1.249) * (1.0 - uGesture.y * .94);
  } else if (part > .5) {
    float side = part < 1.5 ? -1.0 : 1.0;
    vec2 shoulder = vec2(side * .56, side < 0.0 ? 1.16 : 1.02);
    mat2 joint = turn(side * uGesture.x);
    p.xy = shoulder + joint * (p.xy - shoulder);
    n.xy = joint * n.xy;
  }
  p.xz = turn(uPose.x - .085) * p.xz;
  n.xz = turn(uPose.x - .085) * n.xz;
  p.y *= 1.0 + uPose.w;
  p.xy = turn(uPose.y + .022) * (p.xy - vec2(0.0, .18)) + vec2(uGesture.z, .18 + uPose.z);
  n.xy = turn(uPose.y + .022) * n.xy;
  p.yz = turn(.025) * p.yz;
  n.yz = turn(.025) * n.yz;
  vRest = aPosition;
  vNormal = n;
  vColor = aColor;
  vMaterial = aSurface.xy;
  gl_Position = vec4((p.x + .018) / 1.12, (p.y - 1.025) / 1.12, -p.z * .75, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec3 vNormal, vRest, vColor;
varying vec2 vMaterial;
// Soft contact from the largest pieces makes the perched character read clearly
// even when drawn only 60 CSS pixels tall. No shadow map or extra render pass.
float coverage(vec3 center, vec3 radii, vec3 lamp) {
  vec3 near = (center - vRest) / radii;
  vec3 ray = normalize(lamp / radii);
  float along = dot(near, ray);
  float distance = length(near - along * ray);
  return smoothstep(.04,.5,along) * (1.0-smoothstep(.65,1.22,distance));
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 key = normalize(vec3(-.62,.86,.80));
  vec3 rim = normalize(vec3(.83,.35,-.40));
  float hemi = n.y*.5+.5;
  float light = max(dot(n,key),0.0);
  float roughness = vMaterial.x, metal = vMaterial.y;
  float shade = coverage(vec3(0.,1.087,0.), vec3(.60,.626,.49),key);
  shade = max(shade, coverage(vec3(.235,1.245,.52), vec3(.12,.15,.061),key));
  shade = max(shade, coverage(vec3(-.235,1.245,.52), vec3(.12,.15,.061),key));
  shade = max(shade, coverage(vec3(0.,1.03,.554), vec3(.11,.095,.10),key));
  float sky = smoothstep(.02,.96,hemi);
  vec3 indirect = mix(vec3(.245,.30,.385),vec3(.66,.73,.82),sky);
  vec3 base = vColor * (indirect*(1.0-.23*shade) + vec3(.95,.9,.86)*light*(1.0-.73*shade));
  vec3 halfVector = normalize(key + vec3(0.,0.,1.));
  float highlight = pow(max(dot(n,halfVector),0.),mix(80.,9.,roughness));
  float fresnel = pow(1.-max(n.z,0.),3.);
  vec3 sheen = mix(vec3(1.),vColor,metal) * highlight * (.095+metal*.67) * (1.-roughness);
  float edge = max(dot(n,rim),0.)*fresnel;
  vec3 color = base + sheen + vec3(.035,.075,.11)*edge;
  gl_FragColor = vec4(pow(clamp(color,0.,1.),vec3(1./2.2)),1.);
}`;

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(result);
    gl.deleteShader(result);
    throw Error(message);
  }
  return result;
}

function rotate(x, y, z, [qx, qy, qz, qw]) {
  const tx = 2 * (qy*z - qz*y);
  const ty = 2 * (qz*x - qx*z);
  const tz = 2 * (qx*y - qy*x);
  return [x + qw*tx + qy*tz - qz*ty, y + qw*ty + qz*tx - qx*tz, z + qw*tz + qx*ty - qy*tx];
}

function unpack(buffer) {
  const view = new DataView(buffer);
  const treeSize = view.getUint32(12, true);
  const model = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, treeSize)));
  const binaryStart = 28 + treeSize;
  function attribute(id) {
    const acc = model.accessors[id];
    const start = binaryStart + model.bufferViews[acc.bufferView].byteOffset;
    if (acc.type === 'SCALAR') return new Uint16Array(buffer, start, acc.count);
    // Both quantized vec3 attributes use four aligned components per vertex.
    return acc.componentType === 5120 ? new Int8Array(buffer, start, acc.count*4)
                                      : new Int16Array(buffer, start, acc.count*4);
  }
  const vertices = [], indices = [];
  const roles = { body: 0, left: 1, right: 2, eyes: 3 };
  for (const node of model.nodes) {
    const primitive = model.meshes[node.mesh].primitives[0];
    const position = attribute(primitive.attributes.POSITION);
    const normal = attribute(primitive.attributes.NORMAL);
    const material = model.materials[primitive.material].pbrMetallicRoughness;
    const [r,g,b] = material.baseColorFactor;
    const [sx,sy,sz] = node.scale, [tx,ty,tz] = node.translation;
    const base = vertices.length / 12;
    for (let i = 0; i < position.length; i += 4) {
      const p = rotate(position[i]*sx, position[i+1]*sy, position[i+2]*sz, node.rotation);
      const n = rotate(normal[i]/sx, normal[i+1]/sy, normal[i+2]/sz, node.rotation);
      const magnitude = Math.hypot(...n);
      vertices.push(p[0]+tx, p[1]+ty, p[2]+tz, n[0]/magnitude, n[1]/magnitude, n[2]/magnitude,
        r,g,b, material.roughnessFactor, material.metallicFactor, roles[node.extras.part]);
    }
    for (const index of attribute(primitive.indices)) indices.push(base+index);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export async function createRenderer(canvas, signal) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) return null;
  let program, vertices, indices, vertex, fragment;
  function dispose() {
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (vertices) gl.deleteBuffer(vertices);
    if (indices) gl.deleteBuffer(indices);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    const response = await fetch(new URL('../art/dash.glb', import.meta.url), { signal });
    if (!response.ok) throw Error('Dash model unavailable');
    const geometry = unpack(await response.arrayBuffer());
    signal?.throwIfAborted();
    vertex = shader(gl, gl.VERTEX_SHADER, VERTEX);
    fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram();
    for (const item of [vertex, fragment]) gl.attachShader(program,item);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);
    for (const [index,name] of ['aPosition','aNormal','aColor','aSurface'].entries()) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,3,gl.FLOAT,false,48,index*12);
    }
    indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    const body = gl.getUniformLocation(program,'uPose');
    const gesture = gl.getUniformLocation(program,'uGesture');
    function render(pose = REST_POSE) {
      const size = Math.min(DASH_MOTION.maxTextureSize,
        Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, DASH_MOTION.maxPixelRatio))));
      if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
      gl.viewport(0,0,size,size);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform4f(body, pose.yaw, pose.lean, pose.lift, pose.stretch);
      gl.uniform3f(gesture, pose.wing, pose.blink, pose.travel);
      gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    return { render, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
