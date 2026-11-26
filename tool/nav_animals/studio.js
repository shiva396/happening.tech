// Offline clay puppet studio. The baker injects Three.js into a headless canvas.
function createStudio(THREE, palette) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(144, 144);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.32, 1.32, 1.32, -1.32, 0.1, 30);
  camera.position.set(0, 1.2, 8);
  camera.lookAt(0, 0.21, 0);
  scene.add(new THREE.HemisphereLight(palette.skyLight, palette.groundLight, 1.75));
  function light(color, power, x, y, z) {
    const lamp = new THREE.DirectionalLight(color, power);
    lamp.position.set(x, y, z);
    if (z > 0) {
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(512, 512);
      Object.assign(lamp.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 1, far: 14 });
      lamp.shadow.camera.updateProjectionMatrix();
      lamp.shadow.normalBias = 0.015;
    }
    scene.add(lamp);
  }
  light(palette.keyLight, 2.4, -3, 5, 4);
  light(palette.rimLight, 2.7, 3, 3, -4);
  const sphere = new THREE.SphereGeometry(1, 30, 22);
  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.44 }));
    return materials.get(color);
  }
  function ball(parent, x, y, z, w, h, d, color) {
    const mesh = new THREE.Mesh(sphere, material(color));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }
  function joint(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }
  function tube(parent, points, radius, color) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, radius, 9, false), material(color));
    parent.add(mesh);
    for (const p of [points[0], points.at(-1)]) ball(parent, ...p, radius, radius, radius, color);
  }
  const { ink, eyeHighlight } = palette;
  let puppet;
  const depthMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });
  function sculpt(name) {
    if (puppet) scene.remove(puppet.root);
    const monkey = name === "monkey";
    const { coat, cream, paw, innerEar } = palette[name];
    const root = joint(scene, 0, 0, 0);
    const hips = joint(root, 0, 0, 0);
    const head = joint(hips, 0, 0.41, 0.04);
    const tail = joint(hips, -0.13, -0.12, -0.21);
    const arms = [],
      legs = [],
      ears = [],
      eyes = [];
    ball(hips, 0, -0.07, 0, monkey ? 0.3 : 0.36, 0.4, 0.29, coat);
    ball(hips, 0, -0.08, 0.19, 0.23, 0.3, 0.14, cream);
    ball(head, 0, 0, 0, monkey ? 0.39 : 0.44, 0.34, 0.34, coat);
    for (const side of [-1, 1]) {
      const ear = joint(head, side * (monkey ? 0.38 : 0.43), monkey ? 0.1 : 0.17, 0.01);
      ears.push(ear);
      const radius = monkey ? 0.15 : 0.206;
      ball(ear, 0, 0, 0, radius, radius * 0.98, 0.11, coat);
      if (!monkey) {
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          ball(ear, 0.14 * Math.cos(angle), 0.14 * Math.sin(angle), -0.012, 0.082, 0.077, 0.067, coat);
        }
      }
      ball(ear, 0, 0, 0.077, radius * 0.7, radius * 0.7, 0.052, innerEar);
      if (monkey) ball(head, side * 0.15, 0.04, 0.256, 0.17, 0.169, 0.079, cream);
      const eye = joint(head, side * 0.151, 0.062, monkey ? 0.328 : 0.302);
      eyes.push(eye);
      ball(eye, 0, 0, 0, 0.044, 0.052, 0.037, ink);
      ball(eye, -0.013, 0.018, 0.03, 0.013, 0.014, 0.008, eyeHighlight);
      const arm = joint(hips, side * 0.263, 0.105, 0.035);
      const elbow = joint(arm, 0, -0.226, 0);
      const hand = joint(elbow, 0, -0.213, 0.022);
      ball(arm, 0, -0.11, 0, 0.081, 0.17, 0.092, coat);
      ball(elbow, 0, -0.103, 0, 0.073, 0.145, 0.08, coat);
      ball(hand, 0, 0, 0, 0.081, 0.075, 0.073, paw);
      arms.push({ arm, elbow, hand });
      const leg = joint(hips, side * 0.16, -0.245, 0.035);
      const knee = joint(leg, 0, -0.184, 0);
      ball(leg, 0, -0.09, 0, 0.107, 0.14, 0.112, coat);
      ball(knee, 0, -0.076, 0, 0.073, 0.105, 0.081, coat);
      const foot = ball(knee, 0, -0.17, 0.06, 0.091, 0.068, 0.139, paw);
      legs.push({ leg, knee, foot });
    }
    ball(head, 0, -0.076, 0.3, monkey ? 0.166 : 0.135, 0.114, 0.11, cream);
    ball(
      head,
      0,
      monkey ? -0.038 : -0.02,
      0.399,
      monkey ? 0.056 : 0.087,
      monkey ? 0.042 : 0.13,
      monkey ? 0.043 : 0.077,
      ink,
    );
    if (monkey) {
      tube(
        tail,
        [
          [0, 0, 0],
          [-0.21, 0.01, -0.12],
          [-0.47, 0.13, -0.19],
          [-0.6, 0.43, -0.14],
          [-0.49, 0.56, -0.1],
          [-0.375, 0.48, -0.08],
          [-0.415, 0.405, -0.07],
        ],
        0.052,
        coat,
      );
      ball(head, -0.065, 0.31, 0.09, 0.14, 0.073, 0.12, coat).rotation.z = 0.38;
    }
    puppet = { root, hips, head, tail, arms, legs, ears, eyes, monkey };
  }

  function ramp(t, a, b) {
    const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
  }
  function windowAt(t, a, b, c, d) {
    return ramp(t, a, b) * (1 - ramp(t, c, d));
  }

  // The renderer also exports contact points in image space. The browser can
  // plant a foot or a wrist on the live type even when the header changes size.
  function render(t) {
    const { root, hips, head, tail, arms, legs, eyes, ears, monkey } = puppet;
    const walk = windowAt(t, 0.75, 1.02, 2.45, 2.73);
    const step = (t - 0.75) * Math.PI * (monkey ? 3.6 : 2.65);
    const crouch = windowAt(t, 2.52, 2.74, 2.86, 3.04);
    const reach = windowAt(t, 2.78, 3.15, 3.95, 4.72);
    const sit = windowAt(t, 3.94, 4.68, 8.63, 9.06);
    const leave = windowAt(t, 8.63, 9.0, 9.56, 9.96);
    const gaze = windowAt(t, 5.0, 5.55, 6.34, 6.95);
    const wave = windowAt(t, 6.55, 6.92, 7.88, 8.34);
    const breath = Math.sin((t - 4.65) * 3.25);
    const direction = monkey ? 1 : -1;
    root.rotation.y = direction * (0.4 + 0.55 * walk - 0.2 * sit + 0.3 * gaze);
    hips.scale.set(1 + 0.09 * crouch, 1 - 0.17 * crouch + 0.017 * breath * sit, 1 + 0.05 * crouch);
    hips.rotation.z =
      direction * (0.055 * Math.sin(step) * walk + 0.11 * Math.sin((t - 3.4) * 7) * reach - 0.12 * leave);
    head.rotation.set(
      0.12 * crouch - 0.23 * reach + 0.075 * breath * sit,
      direction * (0.54 * gaze - 0.18 * wave),
      0.1 * wave,
    );
    tail.rotation.z = 0.26 * Math.sin(step - 0.6) * walk + 0.21 * Math.sin(t * 3.7) * sit + 0.31 * reach;
    tail.rotation.y = 0.37 * Math.sin(t * 2.4);
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      const { arm, elbow } = arms[i];
      arm.rotation.set(
        0.62 * side * Math.sin(step) * walk - 0.31 * sit,
        0,
        side * (0.18 + 2.51 * reach + 0.75 * leave),
      );
      elbow.rotation.x = -0.22 - 0.4 * sit - 0.32 * reach;
      if (i === (monkey ? 1 : 0)) {
        arm.rotation.z += side * wave * (monkey ? 1.95 : 1.32);
        elbow.rotation.z = side * wave * (monkey ? 0.53 * Math.sin(t * 12) : 0.32);
      }
      const { leg, knee } = legs[i];
      leg.rotation.set(
        -side * 0.83 * Math.sin(step) * walk - 0.69 * crouch - 1.26 * sit - 0.6 * leave,
        0,
        side * (0.12 + 0.12 * reach),
      );
      knee.rotation.x =
        0.3 + 0.48 * Math.max(0, side * Math.sin(step)) * walk + 0.71 * crouch + 1.26 * sit + 0.3 * reach;
      if (sit) knee.rotation.x += 0.22 * side * breath * sit;
      ears[i].rotation.z = side * (0.12 + 0.19 * wave * Math.sin(t * (monkey ? 5 : 11) + i));
      const blink = Math.min(1, 0.12 + Math.min(...[1.35, 4.82, 6.1, 7.95].map((s) => Math.abs(t - s))) * 11);
      eyes[i].scale.y = blink;
    }
    renderer.render(scene, camera);
    const capture = () => renderer.domElement.toDataURL("image/png").split(",")[1];
    const back = capture();
    function projected(node, offset = new THREE.Vector3()) {
      const p = node.localToWorld(offset).project(camera);
      return [(1 + p.x) / 2, (1 - p.y) / 2];
    }
    const foot = Math.max(...legs.map(({ foot }) => projected(foot, new THREE.Vector3(0, -0.95, 0))[1]));
    const grip = Math.min(...arms.map(({ hand }) => projected(hand)[1]));
    const seat = projected(hips, new THREE.Vector3(0, -0.29, 0.05))[1];
    // Depth-only geometry keeps the far foot and fingers occluded by the belly.
    let front = null;
    if (t >= 3.28 && t < 9.08) {
      const visible = new Set();
      for (const { hand } of arms) hand.traverse((node) => visible.add(node));
      if (t >= 4.05) for (const { leg } of legs) leg.traverse((node) => visible.add(node));
      const hidden = [];
      root.traverse((node) => {
        if (!node.isMesh || visible.has(node)) return;
        hidden.push([node, node.material]);
        node.material = depthMaterial;
        node.renderOrder = -1;
      });
      renderer.render(scene, camera);
      front = capture();
      for (const [node, material] of hidden) {
        node.material = material;
        node.renderOrder = 0;
      }
    }
    return { back, front, foot, grip, seat };
  }
  return { sculpt, render };
}
