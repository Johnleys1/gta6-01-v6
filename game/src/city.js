// Aurora Falls — the city: five districts on a snowbound valley floor.
// Buildings, neon, roads, the frozen lake, the ski resort, the mine town
// and the mountain pass, all built from plain geometry + canvas textures.
import * as THREE from "three";

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function snowGroundTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#dfe9f2";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const s = Math.random();
      g.fillStyle = s > 0.5 ? "rgba(255,255,255,0.5)" : "rgba(170,190,215,0.35)";
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = "rgba(190,205,225,0.25)";
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 18, 0, 7);
      g.fill();
    }
  });
}

function windowTexture(base, litRatio) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const cols = 6;
    const rows = 12;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = Math.random() < litRatio;
        g.fillStyle = lit
          ? ["#ffd27a", "#9fd8ff", "#ff9d5c", "#c8f7d4"][Math.floor(Math.random() * 4)]
          : "rgba(10,16,28,0.85)";
        g.fillRect(8 + c * 19, 10 + r * 20, 13, 12);
      }
    }
  });
}

function neonSignTexture(text, color) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = "#0a0a12";
    g.fillRect(0, 0, w, h);
    g.font = "bold 34px monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 4;
    g.fillStyle = "#ffffff";
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

export function createCity(G) {
  const scene = G.scene;
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  const addCollider = (x, z, hw, hd) => {
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  };

  // Valley floor: snow.
  const groundTex = snowGroundTexture();
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(24, 24);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 40);
  group.add(ground);

  // Valley walls: dark mountains ringing the city.
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2c3644, roughness: 1 });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xe8f0f8, roughness: 0.9 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 350 + Math.random() * 40;
    const h = 90 + Math.random() * 130;
    const m = new THREE.Mesh(new THREE.ConeGeometry(55 + Math.random() * 45, h, 5), mountainMat);
    m.position.set(Math.cos(a) * r, h / 2 - 4, 40 + Math.sin(a) * r);
    m.rotation.y = Math.random() * Math.PI;
    group.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(20 + Math.random() * 14, h * 0.32, 5), snowCapMat);
    cap.position.set(m.position.x, h - h * 0.16 - 4, m.position.z);
    cap.rotation.y = m.rotation.y;
    group.add(cap);
  }

  // Roads: a grid through downtown/mine/resort, plus the lake ring road.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x232830, roughness: 0.55, metalness: 0.1 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c25a });
  const roads = [];
  function road(x, z, w, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    group.add(m);
    roads.push({ x, z, w, d });
    // Centre dashes.
    const n = Math.floor(Math.max(w, d) / 12);
    for (let i = 0; i < n; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), lineMat);
      dash.rotation.x = -Math.PI / 2;
      if (w > d) dash.position.set(x - w / 2 + 6 + i * 12, 0.09, z);
      else dash.position.set(x, 0.09, z - d / 2 + 6 + i * 12);
      if (w <= d) dash.rotation.z = Math.PI / 2;
      group.add(dash);
    }
  }
  for (const x of [-120, -60, 0, 60, 120]) road(x, 40, 10, 480);
  for (const z of [-80, -20, 40, 100, 160]) road(0, z, 480, 10);
  road(0, -150, 10, 120); // lake approach
  road(0, 240, 12, 130); // pass approach
  // Lake ring road.
  const ring = new THREE.Mesh(new THREE.RingGeometry(88, 100, 40), roadMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.07, -210);
  group.add(ring);

  // Streetlights along the grid.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
  const lampPositions = [];
  for (const x of [-120, -60, 0, 60, 120]) {
    for (const z of [-80, -20, 40, 100, 160]) {
      lampPositions.push([x + 7, z + 7]);
    }
  }
  for (const [x, z] of lampPositions) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat);
    pole.position.set(x, 3.5, z);
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.14), poleMat);
    arm.position.set(x - 1, 6.9, z);
    group.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMat);
    lamp.position.set(x - 2, 6.8, z);
    group.add(lamp);
  }
  // A few real lights over downtown (cheap: 3 point lights).
  if (!G.lowPerf) {
    for (const [x, z] of [[0, 40], [-60, 100], [60, -20]]) {
      const pl = new THREE.PointLight(0xffd9a0, 60, 70, 1.8);
      pl.position.set(x, 9, z);
      group.add(pl);
    }
  }

  // ---- Neon Downtown: towers with lit windows and neon signs.
  const towerBases = ["#1a2233", "#232a3d", "#141a28", "#2a2438"];
  const signs = [
    ["AURORA", "#39ff88"], ["HOTEL NORD", "#ff5ca8"], ["SNOWBAR", "#4dd8ff"],
    ["CASINO", "#ffd23f"], ["24H RAMEN", "#ff7a3c"], ["SKI SHOP", "#7dffce"],
    ["NORTHERN", "#b78cff"], ["ICE HOTEL", "#5ce1ff"],
  ];
  let signIdx = 0;
  function tower(x, z, w, h, d) {
    const tex = windowTexture(towerBases[Math.floor(Math.random() * towerBases.length)], 0.5);
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: 0x223044, emissiveIntensity: 0.35 }),
    );
    m.position.set(x, h / 2, z);
    group.add(m);
    // Roof snow cap.
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4), snowCapMat);
    cap.position.set(x, h + 0.35, z);
    group.add(cap);
    // Neon sign on the face toward the nearest road.
    const [text, color] = signs[signIdx++ % signs.length];
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshBasicMaterial({ map: neonSignTexture(text, color), transparent: false }),
    );
    sign.position.set(x, Math.min(h - 4, 22), z + d / 2 + 0.15);
    group.add(sign);
    // A real glow light on every other tower keeps the neon look affordable.
    if (!G.lowPerf && signIdx % 2 === 0) {
      const glow = new THREE.PointLight(new THREE.Color(color), 22, 30, 2);
      glow.position.set(x, Math.min(h - 4, 22), z + d / 2 + 4);
      group.add(glow);
    }
    addCollider(x, z, w / 2 + 0.5, d / 2 + 0.5);
  }
  const towerSpots = [
    [-30, -50, 20, 42, 18], [30, -50, 16, 55, 16], [-90, -50, 18, 34, 18],
    [90, -50, 22, 48, 18], [-30, 10, 18, 60, 16], [30, 10, 20, 38, 18],
    [-90, 10, 16, 44, 16], [90, 10, 18, 52, 18], [-30, 70, 20, 36, 18],
    [30, 70, 16, 46, 16], [-90, 70, 18, 58, 18], [90, 70, 20, 40, 18],
    [-30, 130, 18, 34, 16], [30, 130, 20, 44, 18],
  ];
  for (const [x, z, w, h, d] of towerSpots) tower(x, z, w, h, d);

  // ---- Frozen Lake: a vast ice sheet with skaters, fishermen and a promenade.
  const lakeMat = new THREE.MeshStandardMaterial({
    color: 0x9fd4e8, roughness: 0.12, metalness: 0.35,
    emissive: 0x1a3a55, emissiveIntensity: 0.5,
  });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(88, 40), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, 0.1, -210);
  group.add(lake);
  // Skaters: tiny moving figures (animated in main loop via userData).
  const skaterMat = new THREE.MeshStandardMaterial({ color: 0xff5c5c, roughness: 0.7 });
  const skaters = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.1, 3, 6), skaterMat);
    const a = Math.random() * Math.PI * 2;
    const r = 15 + Math.random() * 60;
    s.position.set(Math.cos(a) * r, 0.9, -210 + Math.sin(a) * r);
    s.userData = { a, r, speed: 0.1 + Math.random() * 0.25, phase: Math.random() * 7 };
    group.add(s);
    skaters.push(s);
  }
  // Ice-fishing huts.
  const hutMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const hut = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), hutMat);
    hut.position.set(Math.cos(a) * 45, 1.5, -210 + Math.sin(a) * 45);
    group.add(hut);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2, 4), snowCapMat);
    roof.position.set(hut.position.x, 4, hut.position.z);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    addCollider(hut.position.x, hut.position.z, 2.4, 2.4);
  }
  // Lakeside promenade lights.
  for (let i = 0; i < (G.lowPerf ? 3 : 6); i++) {
    const a = (i / (G.lowPerf ? 3 : 6)) * Math.PI * 2;
    const pl = new THREE.PointLight(0x7fd4ff, 10, 22, 2);
    pl.position.set(Math.cos(a) * 96, 4, -210 + Math.sin(a) * 96);
    group.add(pl);
  }

  // ---- Ski Resort: slopes, lifts, chalets, floodlit pistes.
  const slopeMat = new THREE.MeshStandardMaterial({ color: 0xe6eef7, roughness: 0.9 });
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(150, 130), slopeMat);
  slope.rotation.x = -Math.PI / 2;
  slope.rotation.z = 0;
  slope.position.set(190, 0.15, 150);
  slope.rotation.x = -Math.PI / 2 + 0.12;
  group.add(slope);
  // Piste: a groomed lane down the slope with floodlights.
  const pisteMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.85 });
  const piste = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), pisteMat);
  piste.rotation.x = -Math.PI / 2 + 0.12;
  piste.position.set(190, 0.5, 150);
  group.add(piste);
  for (const z of [110, 135, 160, 185]) {
    const fl = new THREE.PointLight(0xffffff, 40, 45, 1.8);
    fl.position.set(182, 10, z);
    group.add(fl);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 9, 6), poleMat);
    pole.position.set(180, 4.5, z);
    group.add(pole);
  }
  // Chalets.
  const chaletMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  for (const [x, z] of [[150, 110], [165, 195], [230, 120], [225, 190], [150, 160]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), chaletMat);
    c.position.set(x, 2.5, z);
    group.add(c);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 3.5, 4), snowCapMat);
    roof.position.set(x, 6.7, z);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 2),
      new THREE.MeshBasicMaterial({ map: neonSignTexture("LODGE", "#ffd27a") }),
    );
    win.position.set(x, 3, z + 4.1);
    group.add(win);
    addCollider(x, z, 5.5, 4.5);
  }
  // Cable car: two towers, a cable line, two cabins that glide.
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 130, 5), cableMat);
  cable.rotation.x = Math.PI / 2;
  cable.rotation.z = 0.35;
  cable.position.set(200, 26, 150);
  group.add(cable);
  const cabins = [];
  for (let i = 0; i < 2; i++) {
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3.4, 3),
      new THREE.MeshStandardMaterial({ color: 0xd23c3c, roughness: 0.4, metalness: 0.4 }),
    );
    cab.userData = { t: i * 0.5, dir: i === 0 ? 1 : -1 };
    group.add(cab);
    cabins.push(cab);
  }

  // ---- Old Mine Town: wooden houses, mine shafts, rusted cable cars.
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4126, roughness: 1 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x7a3b22, roughness: 0.9, metalness: 0.3 });
  for (const [x, z] of [[-160, 100], [-190, 160], [-220, 110], [-160, 170], [-210, 90], [-180, 200]]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 8), woodMat);
    h.position.set(x, 2.25, z);
    group.add(h);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 3, 4), snowCapMat);
    roof.position.set(x, 6, z);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
    addCollider(x, z, 5, 4.5);
  }
  // Mine headframe + shaft mouth.
  const head = new THREE.Mesh(new THREE.BoxGeometry(8, 16, 8), rustMat);
  head.position.set(-230, 8, 150);
  group.add(head);
  const shaft = new THREE.Mesh(new THREE.CircleGeometry(6, 16), new THREE.MeshStandardMaterial({ color: 0x050505 }));
  shaft.rotation.x = -Math.PI / 2;
  shaft.position.set(-230, 0.12, 168);
  group.add(shaft);
  addCollider(-230, 150, 4.5, 4.5);
  // Rusted ore carts on rails.
  for (let i = 0; i < 3; i++) {
    const cart = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), rustMat);
    cart.position.set(-224 + i * 4, 1.1, 168);
    group.add(cart);
  }

  // ---- The Pass: winding mountain road with avalanche galleries.
  const passMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.6 });
  const passPts = [
    [0, 200], [30, 225], [-20, 250], [25, 275], [0, 300], [-30, 320], [10, 340],
  ];
  for (let i = 0; i < passPts.length - 1; i++) {
    const [x1, z1] = passPts[i];
    const [x2, z2] = passPts[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(11, len), passMat);
    seg.rotation.x = -Math.PI / 2;
    seg.rotation.z = -Math.atan2(x2 - x1, z2 - z1);
    seg.position.set((x1 + x2) / 2, 0.08, (z1 + z2) / 2);
    group.add(seg);
  }
  // Avalanche galleries: concrete shells over the road.
  const galleryMat = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.9 });
  for (const [x, z, rot] of [[15, 237, 0.5], [2, 287, -0.4]]) {
    const gal = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 16, 12, 1, true, 0, Math.PI), galleryMat);
    gal.rotation.z = Math.PI / 2;
    gal.rotation.y = rot;
    gal.position.set(x, 0.1, z);
    group.add(gal);
  }

  // ---- Snow pines scattered outside the roads.
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1d4a2a, roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 1 });
  for (let i = 0; i < 90; i++) {
    const x = (Math.random() - 0.5) * 680;
    const z = 40 + (Math.random() - 0.5) * 680;
    if (Math.abs(x) < 150 && Math.abs(z - 40) < 170) continue; // keep downtown clear
    if (Math.hypot(x, z + 210) < 105) continue; // keep the lake clear
    const h = 5 + Math.random() * 7;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 5), trunkMat);
    trunk.position.set(x, 0.8, z);
    group.add(trunk);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, h, 7), pineMat);
    cone.position.set(x, 1.6 + h / 2, z);
    group.add(cone);
    const snowTop = new THREE.Mesh(new THREE.ConeGeometry(1.4, h * 0.35, 7), snowCapMat);
    snowTop.position.set(x, 1.6 + h * 0.82, z);
    group.add(snowTop);
  }

  function update(dt, t) {
    // Skaters glide in slow circles on the lake.
    for (const s of skaters) {
      s.userData.a += s.userData.speed * dt * 0.3;
      const a = s.userData.a;
      const r = s.userData.r;
      s.position.set(Math.cos(a) * r, 0.9 + Math.abs(Math.sin(t * 2 + s.userData.phase)) * 0.15, -210 + Math.sin(a) * r);
      s.rotation.y = -a;
    }
    // Cable car cabins glide along the cable.
    for (const cab of cabins) {
      cab.userData.t += dt * 0.02 * cab.userData.dir;
      if (cab.userData.t > 1 || cab.userData.t < 0) cab.userData.dir *= -1;
      const tt = cab.userData.t;
      cab.position.set(200 - 55 + tt * 110, 26 - Math.sin(tt * Math.PI) * 2, 150 - 18 + tt * 36);
    }
  }

  // Terrain height: flat everywhere except the ski slope, a tilted plane
  // centred on (190, 150) that rises toward the north (-z). Cars, skiers
  // and police ride on it instead of sinking under it.
  function groundHeightAt(x, z) {
    if (x >= 115 && x <= 265 && z >= 85 && z <= 215) {
      return Math.max(0, 0.15 + (150 - z) * 0.1205);
    }
    return 0;
  }

  return { group, colliders, roads, skaters, update, groundHeightAt };
}
