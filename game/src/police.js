// Aurora Falls — the law: AFPD dispatch, wanted 1–5, the NORTHERN-1
// helicopter with its searchlight, roadblocks, spike strips and RAM/PIT.
import * as THREE from "three";

export function createPolice(G) {
  const scene = G.scene;
  const state = G.state;
  const units = []; // police cars
  const roadblocks = [];
  const spikes = [];
  let heli = null;
  let heliLight = null;
  let heliCone = null;
  let heliPhase = 0;
  let heliRadius = 26;
  let heliHeight = 42;
  let decayTimer = 0;

  // Shift the helicopter's orbit phase (scene staging: put NORTHERN-1 in frame).
  function setHeliPhase(v) {
    heliPhase = v;
  }

  // Widen the helicopter's orbit (scene staging: a distant heli reads in frame).
  function setHeliRadius(v) {
    heliRadius = v;
  }

  // Lower/raise the helicopter (scene staging: keep it inside the frame).
  function setHeliHeight(v) {
    heliHeight = v;
  }

  function makePoliceCar() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.62, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.35, metalness: 0.5 }),
    );
    body.position.y = 0.55;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0d1420, roughness: 0.2, metalness: 0.6 }),
    );
    cabin.position.set(0, 1.1, -0.2);
    g.add(cabin);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.5, -0.2);
    bar.userData.isLightbar = true;
    g.add(bar);
    const bar2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }),
    );
    bar2.position.set(0.6, 1.5, -0.2);
    bar2.userData.isLightbar = true;
    g.add(bar2);
    scene.add(g);
    return g;
  }

  function makeHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.6, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x22303e, roughness: 0.4, metalness: 0.5 }),
    );
    g.add(body);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 5),
      new THREE.MeshStandardMaterial({ color: 0x22303e, roughness: 0.4, metalness: 0.5 }),
    );
    tail.position.set(0, 0.2, -4.6);
    g.add(tail);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }),
    );
    rotor.position.y = 1.1;
    g.add(rotor);
    g.userData.rotor = rotor;
    // Navigation lights: red port, green starboard, white tail strobe — so
    // NORTHERN-1 reads against the night sky at distance.
    const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    navRed.position.set(-1.3, -0.4, 1.5);
    g.add(navRed);
    const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    navGreen.position.set(1.3, -0.4, 1.5);
    g.add(navGreen);
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    strobe.position.set(0, 0.3, -7.2);
    g.add(strobe);
    g.userData.strobe = strobe;
    // Searchlight: a real spotlight + a visible translucent cone.
    const spot = new THREE.SpotLight(0xfff6c8, 400, 130, 0.16, 0.35, 1.1);
    spot.position.set(0, -0.6, 0);
    const tgt = new THREE.Object3D();
    g.add(tgt);
    spot.target = tgt;
    g.add(spot);
    const coneGeo = new THREE.ConeGeometry(7, 42, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI; // apex up at the heli
    cone.position.y = -21;
    g.add(cone);
    scene.add(g);
    return { group: g, spot, cone, target: tgt };
  }

  function spawnUnit() {
    const p = G.vehicles.player.pos;
    const a = Math.random() * Math.PI * 2;
    const mesh = makePoliceCar();
    mesh.position.set(p.x + Math.cos(a) * 55, G.city.groundHeightAt(p.x + Math.cos(a) * 55, p.z + Math.sin(a) * 55), p.z + Math.sin(a) * 55);
    units.push({ mesh, speed: 0, ram: false });
    G.audio.sirenBlip();
  }

  function placeRoadblockAhead(dist) {
    const p = G.vehicles.player.pos;
    const h = G.vehicles.player.heading;
    const bx = p.x + Math.sin(h) * dist;
    const bz = p.z + Math.cos(h) * dist;
    const block = new THREE.Group();
    const barMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.5, metalness: 0.4 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff2a2a, roughness: 0.5 });
    for (let i = -1; i <= 1; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 0.6), i === 0 ? stripeMat : barMat);
      bar.position.set(i * 3.6, 0.9, 0);
      block.add(bar);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 1.4), barMat);
      leg.position.set(i * 3.6, 0.55, 0);
      block.add(leg);
    }
    block.position.set(bx, G.city.groundHeightAt(bx, bz), bz);
    block.rotation.y = h + Math.PI / 2;
    scene.add(block);
    // Two units flanking the block.
    for (const side of [-1, 1]) {
      const u = makePoliceCar();
      u.position.set(bx + Math.cos(h + Math.PI / 2) * side * 7, 0, bz + Math.sin(h + Math.PI / 2) * side * 7);
      u.rotation.y = h + Math.PI;
      units.push({ mesh: u, speed: 0, ram: false, guarding: true });
    }
    roadblocks.push({ group: block, x: bx, z: bz, until: state.time + 45 });
    G.ui.toast("AFPD roadblock ahead — find another way", "JUNE");
  }

  function placeSpikeStrip(dist) {
    const p = G.vehicles.player.pos;
    const h = G.vehicles.player.heading;
    const sx = p.x + Math.sin(h) * dist;
    const sz = p.z + Math.cos(h) * dist;
    const strip = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.22, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }),
    );
    strip.add(base);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 4), spikeMat);
      spike.position.set(-2.6 + i * 0.65, 0.35, 0);
      strip.add(spike);
    }
    strip.position.set(sx, G.city.groundHeightAt(sx, sz) + 0.12, sz);
    strip.rotation.y = h + Math.PI / 2;
    scene.add(strip);
    spikes.push({ group: strip, x: sx, z: sz, armed: true });
  }

  function addWanted(n, why) {
    if (state.wanted >= 5) return;
    state.wanted = Math.min(5, state.wanted + n);
    state.wantedHeat = 0;
    G.ui.toast(`Wanted ${state.wanted}★ — ${why || "AFPD responding"}`, "AFPD");
    G.ui.updateWanted();
    if (state.wanted >= 2 && units.length < state.wanted + 1) spawnUnit();
    if (state.wanted >= 3 && !heli) {
      const h = makeHeli();
      heli = h.group;
      heliLight = h.spot;
      heliCone = h.cone;
      G.ui.toast("NORTHERN-1 on station — searchlight sweeping", "AFPD");
    }
    if (state.wanted >= 3 && roadblocks.length === 0) placeRoadblockAhead(70);
    if (state.wanted >= 4 && spikes.length === 0) placeSpikeStrip(45);
  }

  function addHeat(n) {
    state.wantedHeat += n;
    if (state.wantedHeat >= 100) addWanted(1, "Spotted by AFPD");
  }

  function clearWanted() {
    state.wanted = 0;
    state.wantedHeat = 0;
    for (const u of units) scene.remove(u.mesh);
    units.length = 0;
    for (const r of roadblocks) scene.remove(r.group);
    roadblocks.length = 0;
    for (const s of spikes) scene.remove(s.group);
    spikes.length = 0;
    if (heli) {
      scene.remove(heli);
      heli = null;
      heliLight = null;
      heliCone = null;
    }
    G.ui.updateWanted();
  }

  function update(dt) {
    const p = G.vehicles.player.pos;
    // Wanted decays slowly when the player stays clean and unseen.
    decayTimer -= dt;
    if (decayTimer <= 0) {
      decayTimer = 4;
      if (state.wanted > 0 && state.wantedHeat <= 0) {
        const nearest = units.reduce((m, u) => Math.min(m, Math.hypot(u.mesh.position.x - p.x, u.mesh.position.z - p.z)), 999);
        if (nearest > 90 && !heli) {
          state.wanted = Math.max(0, state.wanted - 1);
          G.ui.updateWanted();
          if (state.wanted === 0) clearWanted();
        }
      }
    }
    state.wantedHeat = Math.max(0, state.wantedHeat - dt * 2);

    // Police cars pursue.
    const wantSpeed = 10 + state.wanted * 4.5;
    for (const u of units) {
      if (u.guarding) continue;
      const dx = p.x - u.mesh.position.x;
      const dz = p.z - u.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) continue;
      const heading = Math.atan2(dx / d, dz / d);
      let cur = u.mesh.rotation.y;
      let diff = heading - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cur += THREE.MathUtils.clamp(diff, -2.2 * dt, 2.2 * dt);
      u.mesh.rotation.y = cur;
      u.speed = Math.min(wantSpeed, u.speed + 8 * dt);
      u.mesh.position.x += Math.sin(cur) * u.speed * dt;
      u.mesh.position.z += Math.cos(cur) * u.speed * dt;
      u.mesh.position.y = G.city.groundHeightAt(u.mesh.position.x, u.mesh.position.z);
      // RAM / PIT at high wanted: a close pass spins the player.
      if (state.wanted >= 4 && d < 4.5 && !u.ram) {
        u.ram = true;
        G.vehicles.player.speed *= 0.55;
        G.vehicles.player.heading += 0.5;
        state.health = Math.max(0, state.health - 8);
        G.audio.thud();
        G.ui.toast("PIT maneuver! AFPD rammed you", "AFPD");
        setTimeout(() => { u.ram = false; }, 2500);
      }
      // Flash the lightbar.
      const bars = u.mesh.children.filter((c) => c.userData.isLightbar);
      const phase = Math.floor(state.time * 6) % 2 === 0;
      bars.forEach((b, i) => { b.material.color.setHex(i === 0 ? (phase ? 0xff2222 : 0x550000) : (phase ? 0x000055 : 0x2244ff)); });
    }
    // Roadblock expiry.
    for (let i = roadblocks.length - 1; i >= 0; i--) {
      if (state.time > roadblocks[i].until) {
        scene.remove(roadblocks[i].group);
        roadblocks.splice(i, 1);
      }
    }
    // Spike strips pop tires.
    for (const s of spikes) {
      if (!s.armed) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < 3.2 && !state.onFoot) {
        s.armed = false;
        state.tiresPopped = 20;
        G.vehicles.player.speed *= 0.5;
        G.audio.thud();
        G.ui.toast("Spike strip! Tires blown — handling is gone", "AFPD");
        G.combat.spawnSparks(s.x, 0.5, s.z, 0xffcc66);
      }
    }
    // NORTHERN-1: orbit the player, searchlight pinned on them.
    if (heli) {
      const t = state.time;
      const hx = p.x + Math.cos(t * 0.22 + heliPhase) * heliRadius;
      const hz = p.z + Math.sin(t * 0.22 + heliPhase) * heliRadius;
      heli.position.set(hx, heliHeight + Math.sin(t * 0.5) * 2, hz);
      heli.rotation.y = Math.atan2(p.x - hx, p.z - hz);
      heli.userData.rotor.rotation.y += dt * 22;
      if (heli.userData.strobe) heli.userData.strobe.visible = Math.floor(t * 2) % 2 === 0;
      // Spotlight target follows the player with a slow sweep.
      const sweepX = p.x + Math.sin(t * 0.8) * 6;
      const sweepZ = p.z + Math.cos(t * 0.6) * 6;
      heliLight.target.position.set(sweepX - hx, -42, sweepZ - hz);
      heliLight.target.updateMatrixWorld();
      // Keep the visible cone aimed at the same spot.
      heliCone.lookAt(sweepX, 0, sweepZ);
      heliCone.rotateX(Math.PI / 2);
      // The light pool on the ground betrays the player: heat rises.
      addHeat(dt * 1.5);
    }
  }

  return { update, addWanted, addHeat, clearWanted, placeRoadblockAhead, placeSpikeStrip, setHeliPhase, setHeliRadius, setHeliHeight, units, get heli() { return heli; }, roadblocks, spikes };
}
