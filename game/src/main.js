// Aurora Falls — bootstrap: renderer, camera, input, the game loop.
// The city, weather, vehicles, police, combat, missions, progression,
// audio and UI all hang off one game object G.
import * as THREE from "three";
import { createState } from "./state.js";
import { createCity } from "./city.js";
import { createWeather } from "./weather.js";
import { createVehicles } from "./vehicles.js";
import { createPolice } from "./police.js";
import { createCombat } from "./combat.js";
import { createMissions } from "./missions.js";
import { createProgress } from "./progress.js";
import { createAudio } from "./audio.js";
import { createUI } from "./ui.js";
import { createSelftest } from "./selftest.js";

const params = new URLSearchParams(location.search);
const state = createState();
const lowPerf = params.get("perf") === "low";

window.addEventListener("error", (e) => {
  state.errors.push(String(e.message || e.error || "unknown error"));
});

const renderer = new THREE.WebGLRenderer({ antialias: !lowPerf, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(lowPerf ? 1 : Math.min(window.devicePixelRatio, 1.5));
document.getElementById("game").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1220);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1600);
camera.position.set(0, 8, 80);

// Input: held keys plus edge-triggered consumes.
const keys = new Set();
const pressed = new Set();
const input = {
  keys,
  mouseDown: false,
  consume(code) {
    if (pressed.has(code)) {
      pressed.delete(code);
      return true;
    }
    return false;
  },
};
window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  if (e.code === "Enter" && state.mode === "menu") startGame();
  if (e.code === "KeyM" && state.mode === "playing") G.missions.nextMission();
  if (e.code === "KeyG" && state.mode === "playing") G.ui.toggleGarage();
  if (e.code === "KeyR" && state.mode === "playing") G.progress.cycleRadio();
  if (e.code === "KeyP" && state.mode === "playing") G.audio.setMuted(!state.muted);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("mousedown", (e) => {
  if (e.target.closest("button")) return;
  input.mouseDown = true;
  G.audio.resume();
});
window.addEventListener("mouseup", () => { input.mouseDown = false; });
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const G = {
  scene, camera, renderer, state, input, lowPerf,
  city: null, weather: null, vehicles: null, police: null,
  combat: null, missions: null, progress: null, audio: null, ui: null, selftest: null,
};

G.city = createCity(G);
G.weather = createWeather(G);
G.vehicles = createVehicles(G);
G.police = createPolice(G);
G.combat = createCombat(G);
G.missions = createMissions(G);
G.progress = createProgress(G);
G.audio = createAudio(G);
G.ui = createUI(G);
G.selftest = createSelftest(G);
window.__AURORA__ = G;

G.progress.load();
G.ui.showStart();
G.ui.updateWanted();
G.ui.updateWeapon();
G.ui.updateObjective();

function startGame() {
  if (state.mode !== "menu") return;
  state.mode = "playing";
  G.ui.hideStart();
  G.audio.resume();
  G.audio.setStation(state.radioStation);
  G.ui.banner("AURORA FALLS", "Kai. Maya. Dario. June. The Warden owns the mountain — take it back.");
  G.ui.bark("June: First job's on the board. Press M when you're ready.", "JUNE");
}
document.getElementById("play").addEventListener("click", startGame);
window.startGame = startGame;

// Scene presets / self-test from the URL (screenshots + play-test). A bad
// preset must never freeze the game: the loop starts either way.
const sceneName = params.get("scene");
const doSelftest = params.get("selftest") === "1";
if (sceneName) {
  try {
    G.selftest.applyScene(sceneName);
  } catch (e) {
    state.errors.push("scene preset failed: " + (e && e.message ? e.message : e));
  }
} else if (doSelftest) {
  state.selftest = true;
  setTimeout(() => G.selftest.runSelftest(), 900);
}

// Chase camera: behind the car, lerped; closer on foot.
const camTarget = new THREE.Vector3(0, 4, 70);
const camPos = new THREE.Vector3(0, 8, 80);
const lookAt = new THREE.Vector3();
function updateCamera(dt) {
  const p = G.vehicles.player;
  const dist = state.onFoot ? 7 : 11.5;
  const height = p.pos.y + (state.onFoot ? 3.4 : 5);
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  const tx = p.pos.x + fx * 9;
  const tz = p.pos.z + fz * 9;
  const px = p.pos.x - fx * dist;
  const pz = p.pos.z - fz * dist;
  const k = 1 - Math.exp(-dt * 4.5);
  camTarget.x += (tx - camTarget.x) * k;
  camTarget.z += (tz - camTarget.z) * k;
  camTarget.y += (p.pos.y + 1.6 - camTarget.y) * k;
  camPos.x += (px - camPos.x) * k;
  camPos.z += (pz - camPos.z) * k;
  camPos.y += (height - camPos.y) * k;
  // Keep the camera out of the ground on the slopes.
  camPos.y = Math.max(camPos.y, p.pos.y + 2.2);
  camera.position.copy(camPos);
  lookAt.copy(camTarget);
  camera.lookAt(lookAt);
}

const clock = new THREE.Clock();
let lastWastedCheck = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === "playing" || state.mode === "wasted") {
    state.time += dt;
    G.weather.update(dt);
    G.city.update(dt, state.time);
    G.vehicles.update(dt);
    G.police.update(dt);
    G.combat.update(dt);
    G.missions.update(dt);
    G.audio.update(dt);
    G.ui.update(dt);
    updateCamera(dt);
    if (state.mode === "wasted") {
      lastWastedCheck += dt;
      if (lastWastedCheck > 3) {
        lastWastedCheck = 0;
        state.mode = "playing";
        state.health = 100;
        state.onFoot = false;
        G.police.clearWanted();
        G.vehicles.player.pos.set(0, 0, 60);
        G.vehicles.player.speed = 0;
        G.ui.hideWasted();
        G.ui.toast("AFPD dropped you at the city limits — again", "AFPD");
      }
    }
  } else {
    // Menu backdrop: slow orbit over downtown.
    state.time += dt;
    G.weather.update(dt);
    G.city.update(dt, state.time);
    const t = state.time * 0.05;
    camera.position.set(Math.cos(t) * 150, 60, 40 + Math.sin(t) * 150);
    camera.lookAt(0, 10, 40);
  }
  renderer.render(scene, camera);
}
loop();

console.log("Aurora Falls ready — press PLAY");
