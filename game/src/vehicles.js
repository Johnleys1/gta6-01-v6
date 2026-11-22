// Aurora Falls — vehicles: the player's car with snow/ice handling,
// carjacking, traffic, pedestrians and working snowplows.
import * as THREE from "three";

const CAR_COLORS = [0xc23b2e, 0x2e6fc2, 0xe8b73a, 0x3aa88f, 0x8a8f98, 0xdde3ea, 0x5a3a8a, 0x222222];

export function makeCarMesh(color, isPlayer) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.55, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x10151f, roughness: 0.15, metalness: 0.7 }),
  );
  cabin.position.set(0, 1.1, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w);
    wheels.push(w);
  }
  // Headlights: two small emissive discs + one real spotlight for the player.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lampMat);
    lamp.position.set(x, 0.6, 2.22);
    g.add(lamp);
  }
  // Taillights: red, so a car reads from behind (chase camera).
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), tailMat);
    tail.position.set(x, 0.62, -2.22);
    g.add(tail);
  }
  if (isPlayer) {
    const beam = new THREE.SpotLight(0xffe9b0, 90, 55, 0.5, 0.45, 1.4);
    beam.position.set(0, 0.9, 2.1);
    const tgt = new THREE.Object3D();
    tgt.position.set(0, 0, 26);
    g.add(tgt);
    beam.target = tgt;
    g.add(beam);
    g.userData.beam = beam;
  }
  g.userData.wheels = wheels;
  return g;
}

export function createVehicles(G) {
  const scene = G.scene;
  const state = G.state;

  const player = {
    mesh: makeCarMesh(0xd8d3c8, true),
    pos: new THREE.Vector3(0, 0, 60),
    heading: Math.PI, // facing north, up the grid toward downtown
    speed: 0, // m/s, signed
    steer: 0,
    drift: 0,
    kind: "sedan",
    onFootPos: null,
  };
  player.mesh.position.copy(player.pos);
  player.mesh.rotation.y = player.heading;
  scene.add(player.mesh);

  const traffic = [];
  const trafficRoutes = [
    { pts: [[-120, -80], [-120, 160], [120, 160], [120, -80]], speed: 9 },
    { pts: [[-60, 160], [-60, -80], [60, -80], [60, 160]], speed: 11 },
    { pts: [[-120, 40], [120, 40], [120, 100], [-120, 100]], speed: 10 },
    { pts: [[0, -80], [0, 160], [-120, 160], [-120, -80]], speed: 8 },
  ];
  for (let i = 0; i < 10; i++) {
    const route = trafficRoutes[i % trafficRoutes.length];
    const mesh = makeCarMesh(CAR_COLORS[i % CAR_COLORS.length], false);
    const start = route.pts[i % route.pts.length];
    mesh.position.set(start[0] + (Math.random() - 0.5) * 6, 0, start[1] + (Math.random() - 0.5) * 6);
    scene.add(mesh);
    traffic.push({ mesh, route, seg: i % route.pts.length, color: CAR_COLORS[i % CAR_COLORS.length], alive: true, burning: 0, hp: 100 });
  }

  // Snowplows working the roads.
  const plows = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 4.6),
      new THREE.MeshStandardMaterial({ color: 0xe8862e, roughness: 0.5, metalness: 0.3 }),
    );
    body.position.y = 0.9;
    g.add(body);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.9, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x9aa2ae, roughness: 0.35, metalness: 0.8 }),
    );
    blade.position.set(0, 0.45, 2.5);
    blade.rotation.x = 0.25;
    g.add(blade);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffa500 }),
    );
    beacon.position.set(0, 1.8, 0);
    g.add(beacon);
    const startX = [-60, 0, 60][i];
    g.position.set(startX, 0, -40 + i * 70);
    scene.add(g);
    plows.push({ mesh: g, x: startX, z: -40 + i * 70, dir: 1, speed: 5, kind: "plow" });
  }

  // Pedestrians in winter clothes.
  const peds = [];
  const pedColors = [0xd95f5f, 0x5f8fd9, 0x7ac74f, 0xe8c84a, 0xb06fd9, 0xeeeeee];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.9, 3, 6),
      new THREE.MeshStandardMaterial({ color: pedColors[i % pedColors.length], roughness: 0.9 }),
    );
    const x = (Math.random() - 0.5) * 260;
    const z = (Math.random() - 0.5) * 260 + 40;
    m.position.set(x, 0.85, z);
    scene.add(m);
    peds.push({ mesh: m, x, z, dir: Math.random() * Math.PI * 2, speed: 0.9 + Math.random() * 0.7, alive: true });
  }

  // Skiers on the piste.
  const skiers = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 3, 6),
      new THREE.MeshStandardMaterial({ color: [0xff3b30, 0x34c759, 0x0a84ff][i % 3], roughness: 0.8 }),
    );
    m.position.set(186 + Math.random() * 8, 1, 110 + Math.random() * 70);
    scene.add(m);
    skiers.push({ mesh: m, t: Math.random(), speed: 0.05 + Math.random() * 0.05 });
  }

  function collide(pos, radius) {
    // Push a circle out of building colliders.
    for (const c of G.city.colliders) {
      const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x = nx + (dx / d) * radius;
          pos.z = nz + (dz / d) * radius;
          return true;
        }
        pos.x += radius;
        return true;
      }
    }
    return false;
  }

  function nearestStealable(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const t of traffic) {
      if (!t.alive) continue;
      const d = Math.hypot(t.mesh.position.x - player.pos.x, t.mesh.position.z - player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = { kind: "car", ref: t };
      }
    }
    for (const p of plows) {
      const d = Math.hypot(p.mesh.position.x - player.pos.x, p.mesh.position.z - player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = { kind: "plow", ref: p };
      }
    }
    return best;
  }

  function carjack() {
    const target = nearestStealable(7);
    if (!target) return false;
    if (target.kind === "car") {
      const t = target.ref;
      t.alive = false;
      scene.remove(t.mesh);
      player.kind = "sedan";
    } else {
      const p = target.ref;
      scene.remove(p.mesh);
      plows.splice(plows.indexOf(p), 1);
      player.kind = "plow";
      // Maya's note: the plow clears its own path.
      G.ui.toast("Snowplow stolen — the Pass is yours to clear", "KAI");
    }
    state.stats.carsStolen++;
    state.onFoot = false;
    if (G.police) G.police.addWanted(1, "Grand theft auto");
    G.ui.toast("Carjacked — AFPD is watching", "JUNE");
    return true;
  }

  function update(dt) {
    const input = G.input;
    const st = state;
    // --- Player on foot: simple WASD walk.
    if (st.onFoot) {
      const speed = 5;
      let mx = 0;
      let mz = 0;
      if (input.keys.has("KeyW")) mz -= 1;
      if (input.keys.has("KeyS")) mz += 1;
      if (input.keys.has("KeyA")) mx -= 1;
      if (input.keys.has("KeyD")) mx += 1;
      if (mx || mz) {
        const len = Math.hypot(mx, mz);
        const heading = Math.atan2(mx / len, mz / len);
        player.pos.x += Math.sin(heading) * speed * dt;
        player.pos.z += Math.cos(heading) * speed * dt;
        player.pos.y = G.city.groundHeightAt(player.pos.x, player.pos.z);
        player.mesh.position.copy(player.pos);
        player.mesh.rotation.y = heading;
        player.mesh.visible = true;
      }
      if (input.consume("KeyE")) carjack();
      return;
    }

    // --- Driving: arcade physics with an ice feel.
    const gripBase = 1.0;
    const tires = st.garage.tires;
    const tireGrip = 1 + tires * 0.18;
    const popped = st.tiresPopped > 0;
    if (popped) st.tiresPopped -= dt;
    const grip = gripBase * tireGrip * (popped ? 0.35 : 1) * (st.weather.blizzard > 0.6 ? 0.82 : 1);
    const engine = 14 + st.garage.engine * 3.5;
    const maxSpeed = (popped ? 16 : 34 + st.garage.engine * 4) * (player.kind === "plow" ? 0.55 : 1);
    const accel = input.keys.has("KeyW") ? engine : 0;
    const brake = input.keys.has("KeyS") ? engine * 1.2 : 0;
    const handbrake = input.keys.has("Space");
    const steerInput = (input.keys.has("KeyA") ? 1 : 0) - (input.keys.has("KeyD") ? 1 : 0);

    // Maya's drift: steering hard at speed while her ability is on slides the car.
    const wantDrift = handbrake || (Math.abs(steerInput) > 0 && Math.abs(player.speed) > 16 && st.crew.maya);
    player.speed += (accel - brake) * dt;
    if (!input.keys.has("KeyW") && !input.keys.has("KeyS")) {
      player.speed -= player.speed * 0.55 * dt; // rolling drag on snow
    }
    player.speed = THREE.MathUtils.clamp(player.speed, -10, maxSpeed);

    const steerAuthority = THREE.MathUtils.clamp(Math.abs(player.speed) / 8, 0, 1);
    const steerRate = (wantDrift ? 2.4 : 1.7) * steerAuthority * (player.speed >= 0 ? 1 : -1);
    player.heading += steerInput * steerRate * dt * (wantDrift ? 1.35 : 1);

    // Velocity follows heading with a slide lag — ice.
    const targetVx = Math.sin(player.heading) * player.speed;
    const targetVz = Math.cos(player.heading) * player.speed;
    const slide = wantDrift ? 0.86 : 0.94; // lower = more slide
    const blend = 1 - Math.pow(slide, dt * 60);
    player.velX = (player.velX ?? targetVx) + (targetVx - (player.velX ?? targetVx)) * blend * grip;
    player.velZ = (player.velZ ?? targetVz) + (targetVz - (player.velZ ?? targetVz)) * blend * grip;
    const prevX = player.pos.x;
    const prevZ = player.pos.z;
    player.pos.x += player.velX * dt;
    player.pos.z += player.velZ * dt;
    // World bounds.
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -330, 330);
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -320, 370);
    if (collide(player.pos, 1.6)) {
      player.speed *= 0.35;
      player.velX *= 0.3;
      player.velZ *= 0.3;
      if (Math.abs(player.speed) > 8) {
        G.audio.thud();
        if (G.police) G.police.addHeat(6);
      }
    }
    const moved = Math.hypot(player.pos.x - prevX, player.pos.z - prevZ);
    st.stats.distance += moved;
    st.speedKmh = Math.abs(player.speed) * 3.6;
    // Ride the terrain (ski slope) instead of sinking under it.
    player.pos.y = G.city.groundHeightAt(player.pos.x, player.pos.z);

    player.mesh.position.copy(player.pos);
    // Visual body roll + wheel spin.
    player.mesh.rotation.y = player.heading;
    player.mesh.rotation.z = -steerInput * 0.05 * steerAuthority;
    const spin = (player.speed * dt) / 0.36;
    for (const w of player.mesh.userData.wheels) w.rotation.x += spin;
    // Headlight beam follows the car.
    if (player.mesh.userData.beam) player.mesh.userData.beam.intensity = 90;

    // Exit / enter car.
    if (input.consume("KeyF")) {
      st.onFoot = true;
      G.ui.toast("On foot — press E near a car to jack it", "JUNE");
    }

    // --- Traffic: follow their routes.
    for (const t of traffic) {
      if (!t.alive) continue;
      const pts = t.route.pts;
      const target = pts[(t.seg + 1) % pts.length];
      const dx = target[0] - t.mesh.position.x;
      const dz = target[1] - t.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 4) {
        t.seg = (t.seg + 1) % pts.length;
        continue;
      }
      const heading = Math.atan2(dx / d, dz / d);
      t.mesh.rotation.y = heading;
      t.mesh.position.x += Math.sin(heading) * t.route.speed * dt;
      t.mesh.position.z += Math.cos(heading) * t.route.speed * dt;
      if (t.burning > 0) {
        t.burning -= dt;
        t.mesh.children[0].material = t.mesh.children[0].material; // keep
        if (t.burning <= 0) {
          // Burnt-out wreck stays where it died.
          t.mesh.children[0].material.color.setHex(0x0a0a0a);
          t.mesh.children[1].material.color.setHex(0x0a0a0a);
        }
      }
    }
    // --- Snowplows crawl their lanes.
    for (const p of plows) {
      p.z += p.dir * p.speed * dt;
      if (p.z > 170 || p.z < -90) p.dir *= -1;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
    }
    // --- Pedestrians wander sidewalks.
    for (const p of peds) {
      if (!p.alive) continue;
      p.x += Math.sin(p.dir) * p.speed * dt;
      p.z += Math.cos(p.dir) * p.speed * dt;
      if (Math.random() < dt * 0.08) p.dir = Math.random() * Math.PI * 2;
      p.x = THREE.MathUtils.clamp(p.x, -300, 300);
      p.z = THREE.MathUtils.clamp(p.z, -300, 350);
      p.mesh.position.set(p.x, 0.85, p.z);
      p.mesh.rotation.y = p.dir;
    }
    // --- Skiers carve down the piste.
    for (const s of skiers) {
      s.t += s.speed * dt;
      if (s.t > 1) s.t = 0;
      const sz = 110 + s.t * 80;
      s.mesh.position.set(190 + Math.sin(s.t * 9) * 5, G.city.groundHeightAt(190, sz) + 1, sz);
    }
  }

  return { player, traffic, plows, peds, skiers, update, carjack, nearestStealable, collide };
}
