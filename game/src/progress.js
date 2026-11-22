// Aurora Falls — progression: money, district standing, respect, the garage
// with snow upgrades, localStorage saves and three radio stations.
export const RADIO = [
  { name: "AURORA FM", mood: "synthwave", tempo: 112, root: 55, wave: "sawtooth" },
  { name: "FROST ROCK", mood: "rock", tempo: 132, root: 65.4, wave: "square" },
  { name: "NORTHERN LIGHTS", mood: "ambient", tempo: 70, root: 110, wave: "sine" },
];

const UPGRADES = [
  { key: "engine", name: "Engine", desc: "+speed, +acceleration", cost: [0, 500, 900, 1400], max: 3 },
  { key: "tires", name: "Snow Tires", desc: "+grip on ice", cost: [0, 400, 800, 1200], max: 3 },
  { key: "armor", name: "Armor", desc: "+health, shrug off PITs", cost: [0, 450, 850, 1300], max: 3 },
  { key: "paint", name: "Aurora Paint", desc: "shimmer paint, +respect", cost: [0, 300, 600, 1000], max: 3 },
];

const SAVE_KEY = "aurora-falls-save-v1";

export function createProgress(G) {
  const state = G.state;

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: state.money, respect: state.respect, standing: state.standing,
        garage: state.garage, missionsDone: state.missionsDone, radioStation: state.radioStation,
      }));
    } catch (e) {
      // Headless / private mode: saves are best-effort.
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      state.money = s.money ?? state.money;
      state.respect = s.respect ?? 0;
      state.standing = Object.assign(state.standing, s.standing || {});
      state.garage = Object.assign(state.garage, s.garage || {});
      state.missionsDone = s.missionsDone || [];
      state.radioStation = s.radioStation || 0;
      return true;
    } catch (e) {
      return false;
    }
  }

  function buyUpgrade(key) {
    const up = UPGRADES.find((u) => u.key === key);
    if (!up) return false;
    const lvl = state.garage[key];
    if (lvl >= up.max) return false;
    const cost = up.cost[lvl + 1];
    if (state.money < cost) {
      G.ui.toast(`Need $${cost} for ${up.name} ${lvl + 1}`, "GARAGE");
      return false;
    }
    state.money -= cost;
    state.garage[key] = lvl + 1;
    if (key === "paint") state.respect = Math.min(100, state.respect + 4);
    G.ui.toast(`${up.name} ${lvl + 1} installed — $${cost}`, "GARAGE");
    save();
    return true;
  }

  function cycleRadio() {
    state.radioStation = (state.radioStation + 1) % RADIO.length;
    G.ui.toast(`Radio: ${RADIO[state.radioStation].name}`, "RADIO");
    G.audio.setStation(state.radioStation);
  }

  function districtStandingText() {
    return Object.entries(state.standing)
      .map(([k, v]) => `${k} ${v}`)
      .join(" · ");
  }

  return { save, load, buyUpgrade, cycleRadio, districtStandingText, UPGRADES, RADIO };
}
