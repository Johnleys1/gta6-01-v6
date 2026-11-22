// Aurora Falls — combat: a 4-weapon wheel, shooting on foot and from the
// car, cars that catch fire, explode and stay behind as burning wrecks.
import * as THREE from "three";

export function createCombat(G) {
  const scene = G.scene;
  const state = G.state;
  const effects = []; // { mesh, life, kind }
  let lastShot = 0;
  let muzzle = null;

  const raycaster = new THREE.Raycaster();

  function spawnSparks(x, y, z, color) {
    const geo = new THREE.BufferGeometry();
    const n = 26;
    const pos = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 7, (Math.random() - 0.5) * 9));
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.32, transparent: true, opacity: 1 }));
    scene.add(pts);
    effects.push({ mesh: pts, life: 0.6, max: 0.6, kind: "sparks", vel });
  }

  function spawnExplosion(x, y, z) {
    // Fireball + smoke + a flash light, then a scorched wreck stays.
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7722, transparent: true, opacity: 0.95 }),
    );
    ball.position.set(x, y + 1, z);
    scene.add(ball);
    const light = new THREE.PointLight(0xff8833, 260, 55, 1.6);
    light.position.set(x, y + 3, z);
    scene.add(light);
    effects.push({ mesh: ball, life: 0.9, max: 0.9, kind: "fireball", light });
    state.stats.explosions++;
    G.audio.explosion();
    // Damage everything nearby.
    for (const t of G.vehicles.traffic) {
      if (!t.alive) continue;
      const d = Math.hypot(t.mesh.position.x - x, t.mesh.position.z - z);
      if (d < 12) damageTrafficCar(t, 80);
    }
    for (const p of G.vehicles.peds) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < 9) {
        p.alive = false;
        scene.remove(p.mesh);
      }
    }
    if (G.police) G.police.addHeat(30);
  }

  function damageTrafficCar(t, dmg) {
    t.hp -= dmg;
    spawnSparks(t.mesh.position.x, 1, t.mesh.position.z, 0xffaa33);
    if (t.hp <= 0 && t.alive) {
      t.alive = false;
      t.burning = 14;
      // The car catches fire: orange glow + smoke, then a blackened wreck.
      const fire = new THREE.PointLight(0xff6622, 90, 25, 1.8);
      fire.position.set(t.mesh.position.x, 2, t.mesh.position.z);
      scene.add(fire);
      effects.push({ mesh: fire, life: 14, max: 14, kind: "carfire", car: t });
      spawnExplosion(t.mesh.position.x, 0.5, t.mesh.position.z);
    }
  }

  function shoot() {
    const w = state.weapons[state.weaponIndex];
    const now = state.time;
    if (now - lastShot < w.rate) return;
    lastShot = now;
    state.stats.shots++;
    const pellets = w.pellets || 1;
    // Aim from the camera through the crosshair.
    const cam = G.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    let hitAnything = false;
    for (let i = 0; i < pellets; i++) {
      const d = dir.clone();
      d.x += (Math.random() - 0.5) * w.spread * 2;
      d.y += (Math.random() - 0.5) * w.spread * 2;
      d.z += (Math.random() - 0.5) * w.spread * 2;
      d.normalize();
      raycaster.set(origin, d);
      raycaster.far = w.range;
      const targets = [];
      for (const t of G.vehicles.traffic) if (t.alive) targets.push(t.mesh);
      for (const u of G.police.units) targets.push(u.mesh);
      for (const p of G.vehicles.peds) if (p.alive) targets.push(p.mesh);
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        const hit = hits[0];
        hitAnything = true;
        state.stats.hits++;
        spawnSparks(hit.point.x, hit.point.y, hit.point.z, 0xffdd66);
        // Find which traffic car was hit.
        let obj = hit.object;
        while (obj && obj.parent && obj.parent !== scene) obj = obj.parent;
        for (const t of G.vehicles.traffic) {
          if (t.mesh === obj) damageTrafficCar(t, w.damage);
        }
        for (const p of G.vehicles.peds) {
          if (p.mesh === obj) {
            p.alive = false;
            scene.remove(p.mesh);
            if (G.police) G.police.addWanted(1, "Shots fired at a pedestrian");
          }
        }
      }
    }
    // Muzzle flash at the camera.
    if (!muzzle) {
      muzzle = new THREE.PointLight(0xffe9a0, 0, 12, 1.6);
      scene.add(muzzle);
    }
    muzzle.position.copy(origin).addScaledVector(dir, 1.2);
    muzzle.intensity = 60;
    G.audio.gunshot(w.key);
    if (G.police) G.police.addHeat(hitAnything ? 14 : 8);
    // Tracer line for a frame.
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      origin.clone().addScaledVector(dir, 1.5),
      origin.clone().addScaledVector(dir, w.range * 0.55),
    ]);
    const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.85 }));
    scene.add(tracer);
    effects.push({ mesh: tracer, life: 0.07, max: 0.07, kind: "tracer" });
  }

  function cycleWeapon(dir) {
    state.weaponIndex = (state.weaponIndex + dir + state.weapons.length) % state.weapons.length;
    G.ui.toast(`Weapon: ${state.weapons[state.weaponIndex].name}`, "KAI");
    G.ui.updateWeapon();
  }

  function update(dt) {
    if (muzzle && muzzle.intensity > 0) muzzle.intensity = Math.max(0, muzzle.intensity - dt * 900);
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life -= dt;
      if (e.life <= 0) {
        scene.remove(e.mesh);
        if (e.light) scene.remove(e.light);
        effects.splice(i, 1);
        continue;
      }
      const k = e.life / e.max;
      if (e.kind === "sparks") {
        const arr = e.mesh.geometry.attributes.position.array;
        for (let j = 0; j < e.vel.length; j++) {
          arr[j * 3] += e.vel[j].x * dt;
          arr[j * 3 + 1] += e.vel[j].y * dt;
          arr[j * 3 + 2] += e.vel[j].z * dt;
          e.vel[j].y -= 12 * dt;
        }
        e.mesh.geometry.attributes.position.needsUpdate = true;
        e.mesh.material.opacity = k;
      } else if (e.kind === "fireball") {
        const s = 1 + (1 - k) * 9;
        e.mesh.scale.set(s, s, s);
        e.mesh.material.opacity = k;
        if (e.light) e.light.intensity = 260 * k;
      } else if (e.kind === "carfire") {
        e.mesh.intensity = 60 + Math.sin(state.time * 23) * 30;
        if (e.car && e.car.burning > 0) {
          e.mesh.position.set(e.car.mesh.position.x, 2, e.car.mesh.position.z);
        }
      } else if (e.kind === "tracer") {
        e.mesh.material.opacity = k * 0.85;
      }
    }
    // Holding mouse / J fires the current weapon.
    if (G.input.mouseDown || G.input.keys.has("KeyJ")) shoot();
    // Weapon keys 1-4.
    for (let i = 0; i < 4; i++) {
      if (G.input.consume(`Digit${i + 1}`)) {
        state.weaponIndex = i;
        G.ui.updateWeapon();
      }
    }
    if (G.input.consume("KeyQ")) cycleWeapon(1);
  }

  return { update, shoot, cycleWeapon, damageTrafficCar, spawnSparks, spawnExplosion };
}
