// Aurora Falls — central game state. One mutable object every system reads
// and writes; nothing here knows about rendering.
export function createState() {
  return {
    mode: "menu", // menu | playing | wasted
    time: 0, // seconds since boot
    dayTime: 0.86, // 0..1, 0.86 = deep night (aurora strongest)
    health: 100,
    money: 250,
    respect: 0, // 0..100
    wanted: 0, // 0..5 stars
    wantedHeat: 0, // 0..100, fills then adds a star
    standing: { downtown: 0, mine: 0, resort: 0, lake: 0, pass: 0 },
    garage: { engine: 0, tires: 0, armor: 0, paint: 0 },
    weapons: [
      { key: "pistol", name: "Pistol", damage: 34, rate: 0.28, spread: 0.012, range: 90, ammo: Infinity },
      { key: "shotgun", name: "Shotgun", damage: 22, rate: 0.9, spread: 0.09, range: 40, ammo: Infinity, pellets: 6 },
      { key: "rifle", name: "Rifle", damage: 55, rate: 0.16, spread: 0.004, range: 160, ammo: Infinity },
      { key: "smg", name: "SMG", damage: 16, rate: 0.08, spread: 0.03, range: 70, ammo: Infinity },
    ],
    weaponIndex: 0,
    onFoot: false,
    tiresPopped: 0, // seconds left of popped-tire handling
    mission: null, // { id, stage, timer, collected, startedAt }
    missionsDone: [],
    crew: { maya: true, dario: true, june: true },
    weather: { snow: 1, blizzard: 0, fog: 0.02, wind: 0.4 },
    stats: { shots: 0, hits: 0, explosions: 0, carsStolen: 0, distance: 0, missions: 0 },
    barks: [], // { text, who, until }
    objective: "Explore Aurora Falls — press M for a mission",
    errors: [],
    muted: false,
    radioStation: 0,
    speedKmh: 0,
    scene: null,
    selftest: false,
  };
}

export const DISTRICTS = [
  { key: "downtown", name: "Neon Downtown", cx: 0, cz: 0, r: 130 },
  { key: "mine", name: "Old Mine Town", cx: -190, cz: 130, r: 95 },
  { key: "resort", name: "Ski Resort", cx: 190, cz: 150, r: 100 },
  { key: "lake", name: "Frozen Lake", cx: 0, cz: -210, r: 110 },
  { key: "pass", name: "The Pass", cx: 0, cz: 290, r: 90 },
];

export function districtAt(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(x - d.cx, z - d.cz);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}
