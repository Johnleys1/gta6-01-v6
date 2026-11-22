// Aurora Falls — the story: 8 staged missions against THE WARDEN, the
// corrupt resort magnate who owns the mountain. Each mission is a set-piece
// with a twist; crew abilities change how they play.
import * as THREE from "three";

export const MISSIONS = [
  {
    id: 1, name: "First Snow",
    brief: "Steal a snowplow, clear a path, escape through the Pass in a blizzard.",
    reward: 400,
    stages: [
      { kind: "steal", vehicle: "plow", text: "Steal a snowplow (walk up and press E)" },
      { kind: "goto", x: 0, z: 200, r: 12, text: "Clear the path — reach the Pass road" },
      { kind: "goto", x: 10, z: 340, r: 14, text: "Escape through the Pass tunnel" },
    ],
  },
  {
    id: 2, name: "Lift Ticket",
    brief: "Ride the cable car up, rob the resort safe house, ski-chase down the piste.",
    reward: 600,
    stages: [
      { kind: "goto", x: 200, z: 150, r: 12, text: "Reach the cable car station" },
      { kind: "goto", x: 165, z: 195, r: 10, text: "Rob the resort safe house" },
      { kind: "goto", x: 190, z: 185, r: 12, text: "Ski-chase down the piste — hit the gates", gates: [[190, 160], [190, 135], [190, 115]] },
    ],
  },
  {
    id: 3, name: "Frozen Assets",
    brief: "Crack the frozen-lake vault during the ice festival while the crowd watches.",
    reward: 750,
    stages: [
      { kind: "goto", x: 0, z: -210, r: 14, text: "Reach the vault on the frozen lake" },
      { kind: "survive", seconds: 25, text: "Hold the vault — crack it while AFPD closes in" },
      { kind: "goto", x: 0, z: -120, r: 12, text: "Slip away to the promenade" },
    ],
  },
  {
    id: 4, name: "Whiteout",
    brief: "Lose a 5-star chase inside a whiteout, using Maya's drift to slip roadblocks.",
    reward: 900,
    stages: [
      { kind: "survive", seconds: 45, text: "Survive the 5-star chase in the whiteout", wanted: 5 },
      { kind: "goto", x: -190, z: 130, r: 14, text: "Vanish into Old Mine Town" },
    ],
  },
  {
    id: 5, name: "Avalanche",
    brief: "Trigger a controlled avalanche to bury a convoy, then loot it before the plows arrive.",
    reward: 1000,
    stages: [
      { kind: "goto", x: 15, z: 237, r: 12, text: "Reach the avalanche gallery" },
      { kind: "trigger", text: "Trigger the avalanche (press E at the charge)" },
      { kind: "collect", points: [[25, 275], [-20, 250], [30, 225]], r: 8, text: "Loot the buried convoy — 3 crates" },
    ],
  },
  {
    id: 6, name: "Neon Debt",
    brief: "Collect from three downtown clubs before the Warden's men torch them.",
    reward: 800,
    stages: [
      { kind: "collect", points: [[-30, -50], [90, 10], [30, 70]], r: 10, text: "Collect from 3 clubs — downtown" },
    ],
  },
  {
    id: 7, name: "The Long Night",
    brief: "An ice-road race across the frozen lake at midnight against the Warden's champion.",
    reward: 1200,
    stages: [
      { kind: "race", points: [[-60, -210], [0, -260], [60, -210], [0, -160], [0, -210]], r: 10, text: "Ice-road race — hit every gate in order" },
    ],
  },
  {
    id: 8, name: "Aurora Heist",
    brief: "Rob the Warden's aurora-view penthouse during the festival fireworks, then escape by frozen lake.",
    reward: 2500,
    stages: [
      { kind: "goto", x: -30, z: 10, r: 12, text: "Reach the penthouse tower" },
      { kind: "survive", seconds: 20, text: "Crack the penthouse safe as fireworks cover the noise", wanted: 4 },
      { kind: "goto", x: 0, z: -210, r: 16, text: "Escape across the frozen lake" },
    ],
  },
];

const BARKS = {
  maya: [
    "Maya: Ice is my road. Follow my line.",
    "Maya: Drift it — the plows can't catch a slide.",
    "Maya: Grip's gone, but I've got you.",
  ],
  dario: [
    "Dario: Cameras are looped. You've got ninety seconds.",
    "Dario: Shutters open. Go, go, go.",
    "Dario: I killed the alarms. Don't make me regret it.",
  ],
  june: [
    "June: Patrols marked — blue dots, avoid them.",
    "June: Safe house two blocks east if it goes loud.",
    "June: The Warden's men are moving. Eyes up.",
  ],
};

export function createMissions(G) {
  const scene = G.scene;
  const state = G.state;
  let beacon = null;
  let beaconRing = null;

  function bark(who) {
    const lines = BARKS[who];
    const line = lines[Math.floor(Math.random() * lines.length)];
    G.ui.bark(line, who.toUpperCase());
  }

  function clearBeacon() {
    if (beacon) scene.remove(beacon);
    if (beaconRing) scene.remove(beaconRing);
    beacon = null;
    beaconRing = null;
  }

  function setBeacon(x, z, color) {
    clearBeacon();
    beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 34, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: color || 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    beacon.position.set(x, 17, z);
    scene.add(beacon);
    beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(4, 5.5, 24),
      new THREE.MeshBasicMaterial({ color: color || 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.set(x, 0.25, z);
    scene.add(beaconRing);
  }

  function currentStage() {
    if (!state.mission) return null;
    const m = MISSIONS.find((mm) => mm.id === state.mission.id);
    return m ? m.stages[state.mission.stage] : null;
  }

  function startMission(id) {
    const m = MISSIONS.find((mm) => mm.id === id);
    if (!m) return false;
    if (state.missionsDone.includes(id)) return false;
    state.mission = { id, stage: 0, timer: 0, collected: 0, startedAt: state.time };
    state.objective = `${m.name}: ${m.stages[0].text}`;
    G.ui.banner(`MISSION — ${m.name}`, m.brief);
    G.ui.toast(m.brief, "KAI");
    bark("june");
    if (id === 1) G.weather.forceBlizzard(true);
    if (id === 4) {
      G.weather.forceBlizzard(true);
      G.police.addWanted(5, "The Warden tipped off AFPD");
    }
    if (id === 8) G.police.addWanted(2, "Penthouse alarms tripped");
    applyStage();
    return true;
  }

  function applyStage() {
    const st = currentStage();
    if (!st) return;
    const m = state.mission;
    m.timer = 0;
    m.collected = 0;
    state.objective = `${MISSIONS.find((mm) => mm.id === m.id).name}: ${st.text}`;
    if (st.kind === "goto" || st.kind === "trigger") setBeacon(st.x, st.z, 0xffd23f);
    else if (st.kind === "collect" || st.kind === "race") setBeacon(st.points[0][0], st.points[0][1], 0x39ff88);
    else if (st.kind === "survive") {
      clearBeacon();
      if (st.wanted) G.police.addWanted(st.wanted - state.wanted, "AFPD closing in");
    } else if (st.kind === "steal") {
      clearBeacon();
      G.ui.toast("Find a snowplow — they're working the grid roads", "JUNE");
    }
    G.ui.updateObjective();
  }

  function advanceStage() {
    const m = state.mission;
    const mission = MISSIONS.find((mm) => mm.id === m.id);
    m.stage++;
    if (m.stage >= mission.stages.length) {
      completeMission(mission);
      return;
    }
    G.ui.toast("Objective complete", "KAI");
    bark(Math.random() < 0.5 ? "maya" : "dario");
    applyStage();
  }

  function completeMission(mission) {
    state.mission = null;
    clearBeacon();
    state.missionsDone.push(mission.id);
    state.stats.missions++;
    state.money += mission.reward;
    const d = G.vehicles.player.pos;
    const dist = districtKey(d.x, d.z);
    state.standing[dist] = Math.min(100, (state.standing[dist] || 0) + 18);
    state.respect = Math.min(100, state.respect + 12);
    G.ui.banner("MISSION COMPLETE", `${mission.name} — $${mission.reward} · Respect +12`);
    state.objective = "Explore Aurora Falls — press M for a mission";
    G.ui.updateObjective();
    G.progress.save();
    if (mission.id === 1) G.weather.forceBlizzard(false);
    if (mission.id === 4) G.weather.forceBlizzard(false);
  }

  function districtKey(x, z) {
    const ds = [
      ["downtown", 0, 0], ["mine", -190, 130], ["resort", 190, 150], ["lake", 0, -210], ["pass", 0, 290],
    ];
    let best = "downtown";
    let bd = Infinity;
    for (const [k, cx, cz] of ds) {
      const dd = Math.hypot(x - cx, z - cz);
      if (dd < bd) {
        bd = dd;
        best = k;
      }
    }
    return best;
  }

  function nextMission() {
    const next = MISSIONS.find((m) => !state.missionsDone.includes(m.id));
    if (next) startMission(next.id);
    else G.ui.toast("All missions done — the mountain is yours", "KAI");
  }

  function update(dt) {
    if (!state.mission) return;
    const m = state.mission;
    const st = currentStage();
    if (!st) return;
    const p = G.vehicles.player.pos;
    m.timer += dt;
    if (beaconRing) {
      const s = 1 + Math.sin(state.time * 3) * 0.12;
      beaconRing.scale.set(s, s, 1);
    }
    if (st.kind === "goto" || st.kind === "trigger") {
      const d = Math.hypot(p.x - st.x, p.z - st.z);
      if (d < st.r) {
        if (st.kind === "goto") advanceStage();
        else if (G.input.consume("KeyE")) {
          G.combat.spawnExplosion(st.x, 0, st.z);
          G.ui.toast("Avalanche triggered — the convoy is buried", "DARIO");
          advanceStage();
        }
      }
    } else if (st.kind === "steal") {
      if (G.vehicles.player.kind === "plow") advanceStage();
    } else if (st.kind === "survive") {
      state.objective = `${MISSIONS.find((mm) => mm.id === m.id).name}: ${st.text} — ${Math.ceil(st.seconds - m.timer)}s`;
      G.ui.updateObjective();
      if (m.timer >= st.seconds) advanceStage();
    } else if (st.kind === "collect" || st.kind === "race") {
      const pt = st.points[m.collected];
      if (!pt) {
        advanceStage();
        return;
      }
      const d = Math.hypot(p.x - pt[0], p.z - pt[1]);
      if (d < st.r) {
        m.collected++;
        G.ui.toast(st.kind === "collect" ? `Collected ${m.collected}/${st.points.length}` : `Gate ${m.collected}/${st.points.length}`, "KAI");
        if (m.collected >= st.points.length) advanceStage();
        else setBeacon(st.points[m.collected][0], st.points[m.collected][1], 0x39ff88);
      }
    }
    // Failing: health hits zero.
    if (state.health <= 0) {
      state.mission = null;
      clearBeacon();
    }
  }

  return { update, startMission, nextMission, currentStage, MISSIONS };
}
