// Aurora Falls — weather: aurora sky, snowfall, blizzard fronts, day/night.
import * as THREE from "three";

export function createWeather(G) {
  const scene = G.scene;

  // Aurora sky dome: a big sphere with a custom shader — green and violet
  // curtains that drift, strongest at night.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 1 },
      uBlizzard: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      uniform float uTime; uniform float uNight; uniform float uBlizzard;
      float band(vec2 p, float t) {
        return sin(p.x * 0.08 + t * 0.25 + sin(p.y * 0.05 - t * 0.13) * 2.0);
      }
      void main() {
        vec3 dir = normalize(vPos);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 night = mix(vec3(0.012, 0.02, 0.05), vec3(0.03, 0.06, 0.12), h);
        vec3 day = mix(vec3(0.55, 0.62, 0.75), vec3(0.75, 0.82, 0.9), h);
        vec3 col = mix(day, night, uNight);
        // Aurora curtains high in the sky.
        float a = band(dir.xz / max(dir.y, 0.08), uTime);
        float curtain = smoothstep(0.45, 1.0, a) * smoothstep(0.03, 0.35, dir.y);
        vec3 aurora = mix(vec3(0.1, 0.95, 0.45), vec3(0.55, 0.25, 0.95), clamp(a * 0.5 + 0.5, 0.0, 1.0));
        col += aurora * curtain * (0.75 + 0.55 * sin(uTime * 0.4 + dir.x * 0.05)) * uNight * 1.4;
        // Stars.
        float s = step(0.9985, fract(sin(dot(floor(dir.xz * 220.0), vec2(12.9898, 78.233))) * 43758.5453));
        col += vec3(s * 0.7 * uNight * step(0.15, dir.y));
        // Blizzard whites out the sky.
        col = mix(col, vec3(0.75, 0.78, 0.82), uBlizzard * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  scene.add(sky);

  // Moon + hemisphere light, dimmed by blizzard.
  const moon = new THREE.DirectionalLight(0xbfd4ff, 1.1);
  moon.position.set(-120, 220, -80);
  scene.add(moon);
  const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x2a2620, 0.75);
  scene.add(hemi);

  // Snowfall: one Points cloud recycled around the camera.
  const SNOW_N = 2600;
  const snowGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(SNOW_N * 3);
  const seed = new Float32Array(SNOW_N);
  for (let i = 0; i < SNOW_N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 220;
    pos[i * 3 + 1] = Math.random() * 70;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    seed[i] = Math.random();
  }
  snowGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const snowMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.55, transparent: true, opacity: 0.9, sizeAttenuation: true,
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  scene.add(snow);

  const fog = new THREE.FogExp2(0x0a1220, 0.0055);
  scene.fog = fog;

  let blizzardTimer = 0;
  let blizzardTarget = 0;

  function update(dt) {
    const st = G.state;
    const t = st.time;
    // Blizzard fronts roll in and out on a slow cycle.
    blizzardTimer -= dt;
    if (blizzardTimer <= 0) {
      blizzardTarget = blizzardTarget > 0.5 ? 0 : 1;
      blizzardTimer = blizzardTarget > 0.5 ? 9 + Math.random() * 6 : 22 + Math.random() * 18;
    }
    const target = st.scene === "chase" ? Math.max(blizzardTarget, 0.35) : blizzardTarget;
    st.weather.blizzard += (target - st.weather.blizzard) * Math.min(1, dt * 0.25);
    st.weather.fog = 0.0055 + st.weather.blizzard * 0.02;
    fog.density = st.weather.fog;

    const night = 0.55 + 0.45 * Math.sin((st.dayTime - 0.25) * Math.PI * 2) * -1;
    // dayTime 0.86 = deep night; keep it simple: night factor from dayTime.
    const nightF = THREE.MathUtils.clamp(1 - Math.abs(st.dayTime - 0.86) * 2.2, 0.35, 1);
    skyMat.uniforms.uTime.value = t;
    skyMat.uniforms.uNight.value = nightF;
    skyMat.uniforms.uBlizzard.value = st.weather.blizzard;
    moon.intensity = 1.1 * nightF * (1 - st.weather.blizzard * 0.6);
    hemi.intensity = 0.75 * (1 - st.weather.blizzard * 0.4);

    // Snow falls and drifts with the wind; recycle around the camera.
    const cam = G.camera.position;
    const arr = snowGeo.attributes.position.array;
    const fall = (7 + st.weather.blizzard * 14) * dt;
    const wind = (2 + st.weather.blizzard * 14) * st.weather.wind * dt;
    for (let i = 0; i < SNOW_N; i++) {
      arr[i * 3 + 1] -= fall * (0.6 + seed[i] * 0.8);
      arr[i * 3] += wind + Math.sin(t * 0.7 + seed[i] * 20) * dt * 1.5;
      arr[i * 3 + 2] += Math.cos(t * 0.5 + seed[i] * 17) * dt * 1.2;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 60 + Math.random() * 10;
        arr[i * 3] = cam.x + (Math.random() - 0.5) * 220;
        arr[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 220;
      }
      if (Math.abs(arr[i * 3] - cam.x) > 120) arr[i * 3] = cam.x + (Math.random() - 0.5) * 220;
      if (Math.abs(arr[i * 3 + 2] - cam.z) > 120) arr[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 220;
    }
    snowGeo.attributes.position.needsUpdate = true;
    snow.position.set(0, 0, 0);
    void night;
  }

  function forceBlizzard(v) {
    blizzardTarget = v ? 1 : 0;
    blizzardTimer = 30;
  }

  return { update, forceBlizzard, skyMat };
}
