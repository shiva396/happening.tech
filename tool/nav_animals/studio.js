// Offline clay puppet studio. The baker injects Three.js into a headless canvas.
function createStudio(THREE) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(144, 144);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.32, 1.32, 1.32, -1.32, 0.1, 30);
  camera.position.set(0, 1.2, 8);
  camera.lookAt(0, 0.21, 0);
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0xaa91b1, 1.75));
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
  light(0xffedc7, 2.4, -3, 5, 4);
  light(0xe2ddff, 2.7, 3, 3, -4);
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
  function cone(parent, x, y, z, width, height, color) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(width, height, 18), material(color));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  let puppet;
  const cream = "#ffdbac",
    ink = "#281f31",
    tan = "#dd9366";
  const coats = {
    monkey: "#a25635",
    fox: "#e77832",
    rabbit: "#c8b6cf",
    frog: "#67a552",
    otter: "#976445",
    penguin: "#384567",
    squirrel: "#c97543",
    panda: "#ba5937",
    seal: "#8eb7c6",
    hedgehog: "#bd9166",
  };

  function sculpt(name) {
    if (puppet) scene.remove(puppet.root);
    const coat = coats[name];
    const root = joint(scene, 0, 0, 0);
    const hips = joint(root, 0, 0, 0);
    const head = joint(hips, 0, 0.42, 0.035);
    const tail = joint(hips, -0.13, -0.12, -0.21);
    const ears = [],
      arms = [],
      legs = [],
      eyes = [];
    const bird = name === "penguin",
      marine = name === "seal",
      frog = name === "frog";
    const tapered = ["fox", "panda", "squirrel"].includes(name);
    const cheek = marine ? "#d7ecdf" : frog ? "#d1d98c" : cream;
    const stout = marine || frog || name === "hedgehog";
    const body = ball(hips, 0, -0.075, 0, stout ? 0.385 : 0.32, frog ? 0.31 : 0.44, stout ? 0.34 : 0.3, coat);
    ball(hips, 0, -0.1, stout ? 0.225 : 0.19, 0.24, frog ? 0.23 : 0.32, 0.14, cheek);
    if (frog) head.position.y = 0.27;
    if (marine) {
      head.position.y = 0.29;
      hips.rotation.x = 0.16;
      body.rotation.z = -0.12;
    }
    if (name === "otter") body.scale.y = 0.51;
    if (name === "hedgehog") {
      head.position.set(0.016, 0.29, 0.13);
      ball(hips, 0, 0.14, -0.09, 0.43, 0.49, 0.34, "#6c473c");
    }
    ball(head, 0, 0, 0, 0.405, 0.35, 0.345, coat);

    for (const side of [-1, 1]) {
      const arm = joint(hips, side * 0.27, 0.08, 0.04);
      const leg = joint(hips, side * 0.175, -0.3, 0.025);
      arms.push(arm);
      legs.push(leg);
      const paw = bird ? "#f8a133" : frog ? "#92c663" : marine ? "#769ead" : tan;
      if (marine) {
        leg.position.set(side * 0.115, -0.33, -0.18);
        leg.scale.set(0.97, 0.47, 1.28);
      }
      if (frog) {
        leg.position.set(side * 0.27, -0.18, 0.035);
        leg.scale.set(1.24, 0.83, 1.15);
      }
      const flipper = bird || marine;
      ball(arm, 0, -0.13, 0, flipper ? 0.098 : 0.083, flipper ? 0.255 : 0.17, 0.095, coat);
      if (!flipper) ball(arm, 0, -0.28, 0.025, 0.087, 0.083, 0.085, paw);
      ball(leg, 0, -0.085, 0, frog ? 0.15 : 0.106, 0.16, 0.105, coat);
      ball(leg, 0, -0.19, 0.075, 0.112, 0.075, frog || bird || name === "rabbit" ? 0.21 : 0.135, paw);
      if (frog) {
        for (const toe of [-1, 0, 1])
          ball(leg, toe * 0.065, -0.195, 0.23 - Math.abs(toe) * 0.022, 0.036, 0.03, 0.053, paw);
        ball(head, side * 0.22, 0.2, 0.13, 0.16, 0.18, 0.15, coat);
      } else if (!bird && !marine) {
        const ear = joint(
          head,
          side * (name === "monkey" ? 0.372 : 0.29),
          tapered || name === "rabbit" ? 0.23 : 0.115,
          0.015,
        );
        ears.push(ear);
        ear.userData.side = side;
        if (name === "rabbit") {
          ball(ear, 0, 0.2, 0, 0.12, 0.32, 0.09, coat);
          ball(ear, 0, 0.22, 0.068, 0.062, 0.23, 0.027, "#eaa9ae");
        } else if (tapered) {
          const size = name === "squirrel" ? 0.34 : 0.3;
          cone(ear, 0, 0.09, 0, 0.151, size, name === "panda" ? cream : coat);
          const inner = cone(ear, 0, 0.082, 0.074, 0.08, size * 0.67, cheek);
          inner.scale.z = 0.42;
        } else {
          const size = name === "monkey" ? 0.154 : 0.085;
          ball(ear, side * 0.035, 0, 0, size, size * 0.98, 0.079, coat);
          ball(
            ear,
            side * 0.036,
            0,
            0.064,
            size * 0.65,
            size * 0.65,
            0.035,
            name === "monkey" ? "#e9a378" : cheek,
          );
        }
      }
      let eyeY = 0.07,
        eyeZ = 0.304;
      if (frog) {
        eyeY = 0.235;
        eyeZ = 0.25;
      } else if (["panda", "penguin", "monkey", "fox"].includes(name)) {
        const patch = ball(head, side * 0.152, 0.06, 0.248, 0.178, 0.174, 0.074, cheek);
        patch.rotation.z = side * -0.23;
        if (name === "panda") ball(head, side * 0.16, 0.062, 0.313, 0.105, 0.099, 0.043, "#643e39");
        eyeZ = name === "panda" ? 0.351 : 0.325;
      }
      const eye = joint(head, side * (frog ? 0.212 : 0.15), eyeY, eyeZ);
      eyes.push(eye);
      ball(eye, 0, 0, 0, 0.042, 0.052, 0.033, ink);
      ball(eye, -0.012, 0.019, 0.026, 0.012, 0.013, 0.008, "#fff4d8");
    }
    if (frog) {
      tube(
        head,
        [
          [-0.21, -0.036, 0.285],
          [-0.08, -0.082, 0.34],
          [0.08, -0.082, 0.34],
          [0.21, -0.036, 0.285],
        ],
        0.013,
        "#466945",
      );
      for (const side of [-1, 1]) ball(head, side * 0.27, -0.025, 0.24, 0.066, 0.034, 0.024, "#dfaa80");
    } else if (bird) {
      ball(head, 0, -0.048, 0.32, 0.115, 0.06, 0.115, "#ffb042");
    } else {
      const noseZ = name === "fox" || name === "hedgehog" ? 0.5 : 0.405;
      ball(head, 0, -0.071, 0.298, 0.168, 0.112, noseZ - 0.25, cheek);
      ball(head, 0, -0.035, noseZ, 0.058, 0.041, 0.04, ink);
      if (marine || name === "otter") {
        for (const s of [-1, 1])
          for (const h of [-0.025, 0.025])
            tube(
              head,
              [
                [s * 0.072, -0.096 + h, 0.401],
                [s * 0.17, -0.105 + h, 0.39],
                [s * 0.28, -0.095 + h * 1.8, 0.34],
              ],
              0.008,
              ink,
            );
      }
    }
    if (name === "panda" || name === "fox") {
      for (const side of [-1, 1]) {
        const cheekTuft = cone(head, side * 0.325, -0.055, 0.095, 0.128, 0.24, cream);
        cheekTuft.rotation.z = side * -1.95;
        if (name === "panda") ball(head, side * 0.135, 0.162, 0.269, 0.07, 0.036, 0.037, cream);
      }
    }
    if (name === "monkey") {
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
    } else if (name === "fox" || name === "panda" || name === "squirrel") {
      const fluffy = name === "squirrel";
      if (fluffy) tail.position.set(-0.24, 0.1, -0.13);
      const tuft = ball(tail, -0.31, 0.2, -0.2, fluffy ? 0.25 : 0.18, fluffy ? 0.5 : 0.41, 0.19, coat);
      tuft.rotation.z = fluffy ? -0.39 : 0.98;
      if (name === "panda") {
        for (let i = 0; i < 3; i++)
          ball(
            tail,
            -0.17 - i * 0.15,
            0.11 + i * 0.095,
            -0.2,
            0.195 - i * 0.01,
            0.08,
            0.193 - i * 0.009,
            cream,
          ).rotation.z = 0.97;
      } else {
        const tip = ball(
          tail,
          fluffy ? -0.43 : -0.563,
          fluffy ? 0.53 : 0.36,
          -0.2,
          0.151,
          fluffy ? 0.23 : 0.18,
          0.14,
          fluffy ? "#f0b576" : cream,
        );
        tip.rotation.z = fluffy ? -0.46 : 0.98;
      }
    } else if (name === "hedgehog") {
      for (let i = 0; i < 28; i++) {
        const angle = i * 2.39996,
          y = ((i + 0.5) / 28) * 1.17 - 0.37,
          radius = Math.sqrt(Math.max(0, 1 - ((y - 0.08) / 0.68) ** 2));
        const x = 0.42 * radius * Math.cos(angle),
          z = -0.13 - 0.22 * radius * Math.abs(Math.sin(angle));
        const spine = cone(hips, x, y, z, 0.119, 0.242, i % 3 ? "#79543f" : "#a57958");
        spine.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(x, y - 0.05, z).normalize(),
        );
      }
    } else if (marine || name === "otter") {
      const t = ball(tail, -0.24, 0.01, -0.19, 0.12, 0.12, 0.43, coat);
      t.rotation.y = 0.98;
      if (marine)
        for (const s of [-1, 1])
          ball(tail, -0.49, 0.035, -0.34 + s * 0.08, 0.16, 0.055, 0.1, coat).rotation.y = s * 0.49;
    } else if (name === "rabbit") ball(tail, -0.13, -0.02, -0.05, 0.15, 0.13, 0.15, cream);
    puppet = { name, root, hips, head, tail, ears, arms, legs, eyes };
  }

  function render(phase, mode) {
    const { name, root, hips, head, tail, ears, arms, legs, eyes } = puppet;
    const a = 2 * Math.PI * phase,
      swing = mode === "orbit",
      beat = Math.sin(a);
    const stretch = swing ? 0.025 * Math.cos(a) : 0.106 * Math.sin(a - 0.48);
    hips.scale.set(1 - stretch * 0.6, 1 + stretch, 1 - stretch * 0.45);
    const rolling = ["hedgehog", "otter", "panda"].includes(name);
    root.rotation.y = 0.32 + (swing ? 0.88 * Math.sin(a - 0.42) : 0.21 * Math.sin(a));
    root.rotation.x = swing && rolling ? 0.52 * Math.sin(a) : 0.12 * Math.cos(a);
    head.rotation.set(0.1 * Math.sin(a + 0.6), 0.13 * Math.sin(a - 0.5), 0.077 * Math.sin(a - 0.8));
    tail.rotation.z = 0.25 * Math.sin(a - 1.0);
    tail.rotation.y = 0.32 * Math.sin(a - 0.7);
    for (const [i, arm] of arms.entries()) {
      const s = i ? 1 : -1;
      const reach = swing ? (i === 0 ? 1.98 : 0.8) : name === "seal" ? 1.0 : 0.42;
      arm.rotation.z = s * (reach + 0.45 * Math.sin(a + s * 0.45));
      arm.rotation.x = 0.53 * Math.cos(a + s);
      const kick = name === "rabbit" || name === "frog" ? beat : s * beat;
      legs[i].rotation.set(0.5 * kick, 0, s * (0.14 + 0.23 * kick));
    }
    for (const ear of ears) ear.rotation.z = ear.userData.side * (0.24 + 0.12 * Math.sin(a - 1));
    const blink = Math.min(1, 0.12 + Math.abs(phase - 0.76) * 18);
    for (const eye of eyes) eye.scale.y = blink;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png").split(",")[1];
  }
  return { sculpt, render };
}
