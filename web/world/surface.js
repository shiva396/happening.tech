// One full-screen triangle projects a cartographic texture onto an analytic sphere.
const vertex = `
attribute vec2 point;
void main() { gl_Position = vec4(point,0.,1.); }`;
const fragment = `
precision highp float;
uniform vec2 viewport;
uniform float radius;
uniform vec2 view;
uniform sampler2D globe;
void main() {
  vec2 q = (gl_FragCoord.xy - viewport*.5)/radius;
  float d = 1.-dot(q,q);
  if (d <= 0.) discard;
  float z = sqrt(d);
  float sn = sin(view.y), cs = cos(view.y);
  float lon = atan(q.x,z*cs-q.y*sn)+view.x;
  float lat = asin(clamp(q.y*cs+z*sn,-1.,1.));
  vec2 uv = vec2(fract(lon/6.28318530718+.5),.5-lat/3.14159265359);
  vec3 color = texture2D(globe,uv).rgb;
  float light = .70 + .34*max(-.45,dot(vec3(q,z),vec3(-.41,.52,.75)))+.045*z;
  float rim = .44*pow(1.-z,5.);
  vec3 lit = mix(color*light,vec3(.565,.855,.976),rim);
  gl_FragColor = vec4(lit, min(1.,d*radius*.67));
}`;
const surfaceURL = new URL("../art/world-surface.webp", import.meta.url);

export async function makeSurface(canvas) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    premultipliedAlpha: false,
  });
  if (!gl) return null;
  const shaders = [];
  let program, buffer, texture;
  function dispose() {
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
  }
  try {
    program = gl.createProgram();
    for (const [kind, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const shader = gl.createShader(kind);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Globe shader unavailable");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Globe program unavailable");
    const bitmap = new Image();
    bitmap.src = surfaceURL;
    await bitmap.decode();
    if (gl.isContextLost()) throw new Error("Globe context lost");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program, "point");
    gl.enableVertexAttribArray(point);
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
    const loc = (name) => gl.getUniformLocation(program, name);
    const viewport = loc("viewport"),
      radius = loc("radius"),
      view = loc("view");
    return {
      draw(width, height, r, camera, quality) {
        const density = Math.min(window.devicePixelRatio || 1, quality, 1500 / Math.max(width, height));
        const w = Math.max(1, Math.round(width * density)),
          h = Math.max(1, Math.round(height * density));
        if (w !== canvas.width || h !== canvas.height) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(viewport, w, h);
        gl.uniform1f(radius, r * density);
        gl.uniform2f(view, (camera.longitude * Math.PI) / 180, (camera.latitude * Math.PI) / 180);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
