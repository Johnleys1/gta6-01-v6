// Aurora Falls — the HUD: health, wanted stars, money, objective, speed,
// weapon, minimap, radio, banners, toasts, start screen and garage.
export function createUI(G) {
  const state = G.state;
  const $ = (id) => document.getElementById(id);
  const minimap = $("minimap");
  const mm = minimap.getContext("2d");

  function setText(id, v) {
    const el = $(id);
    if (el) el.textContent = v;
  }

  function updateWanted() {
    const stars = "★".repeat(state.wanted) + "☆".repeat(5 - state.wanted);
    setText("wanted", stars);
    $("wanted").style.color = state.wanted >= 3 ? "#ff4444" : "#ffd23f";
  }

  function updateWeapon() {
    const w = state.weapons[state.weaponIndex];
    setText("weapon", `${w.name}  [${state.weaponIndex + 1}/4]`);
  }

  function updateObjective() {
    setText("objective", state.objective);
  }

  function updateHUD() {
    setText("money", `$${state.money}`);
    setText("health", `♥ ${Math.round(state.health)}`);
    setText("speed", `${Math.round(state.speedKmh)} km/h`);
    setText("respect", `Respect ${state.respect}`);
    setText("radio", G.progress.RADIO[state.radioStation].name);
    setText("standing", G.progress.districtStandingText());
    $("healthbar").style.width = `${Math.max(0, state.health)}%`;
    $("healthbar").style.background = state.health > 50 ? "#39d353" : state.health > 25 ? "#ffb020" : "#ff4444";
  }

  function banner(title, sub) {
    const b = $("banner");
    b.innerHTML = `<div class="banner-title">${title}</div><div class="banner-sub">${sub || ""}</div>`;
    b.classList.add("show");
    setTimeout(() => b.classList.remove("show"), 4200);
  }

  let barkTimer = null;
  function bark(text, who) {
    const el = $("bark");
    el.innerHTML = `<span class="bark-who">${who}</span> ${text}`;
    el.classList.add("show");
    clearTimeout(barkTimer);
    barkTimer = setTimeout(() => el.classList.remove("show"), 3600);
  }

  let toastTimer = null;
  function toast(text, who) {
    const el = $("toast");
    el.textContent = (who ? who + ": " : "") + text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function showStart() {
    $("start").style.display = "flex";
    $("hud").style.display = "none";
  }

  function hideStart() {
    $("start").style.display = "none";
    $("hud").style.display = "block";
  }

  function showWasted() {
    $("wasted").style.display = "flex";
  }

  function hideWasted() {
    $("wasted").style.display = "none";
  }

  // Garage overlay: four upgrades, click or number keys.
  function toggleGarage(open) {
    const g = $("garage");
    const show = open !== undefined ? open : g.style.display !== "block";
    g.style.display = show ? "block" : "none";
    if (show) {
      const rows = G.progress.UPGRADES.map((u) => {
        const lvl = state.garage[u.key];
        const cost = lvl >= u.max ? "MAX" : `$${u.cost[lvl + 1]}`;
        return `<div class="garage-row"><b>${u.name} ${"●".repeat(lvl)}${"○".repeat(u.max - lvl)}</b>
          <span>${u.desc}</span><button data-up="${u.key}">${cost}</button></div>`;
      }).join("");
      g.innerHTML = `<h2>GARAGE — Aurora Falls</h2><div class="garage-money">Cash: $${state.money}</div>${rows}
        <div class="garage-hint">Click to buy · G closes</div>`;
      g.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          G.progress.buyUpgrade(b.dataset.up);
          toggleGarage(true);
          updateHUD();
        });
      });
    }
  }

  function drawMinimap() {
    const W = 180;
    const H = 180;
    const S = W / 700; // world 700 wide centred at (0, 40)
    const px = (x) => (x + 350) * S;
    const py = (z) => (z + 310) * S;
    mm.fillStyle = "rgba(8,14,24,0.82)";
    mm.fillRect(0, 0, W, H);
    // Districts.
    const cols = { downtown: "#3a6ea5", mine: "#8a6d3b", resort: "#4a7a5a", lake: "#2a7a9a", pass: "#6a5a7a" };
    for (const d of [
      { k: "downtown", x: 0, z: 0, r: 130 }, { k: "mine", x: -190, z: 130, r: 95 },
      { k: "resort", x: 190, z: 150, r: 100 }, { k: "lake", x: 0, z: -210, r: 110 },
      { k: "pass", x: 0, z: 290, r: 90 },
    ]) {
      mm.fillStyle = cols[d.k];
      mm.globalAlpha = 0.5;
      mm.beginPath();
      mm.arc(px(d.x), py(d.z), d.r * S, 0, 7);
      mm.fill();
      mm.globalAlpha = 1;
    }
    // Roads.
    mm.strokeStyle = "rgba(220,220,220,0.55)";
    mm.lineWidth = 1;
    for (const x of [-120, -60, 0, 60, 120]) {
      mm.beginPath(); mm.moveTo(px(x), py(-200)); mm.lineTo(px(x), py(280)); mm.stroke();
    }
    for (const z of [-80, -20, 40, 100, 160]) {
      mm.beginPath(); mm.moveTo(px(-240), py(z)); mm.lineTo(px(240), py(z)); mm.stroke();
    }
    // Mission beacon.
    const st = G.missions.currentStage();
    if (state.mission && st) {
      const pt = st.points ? st.points[state.mission.collected] : null;
      const bx = pt ? pt[0] : st.x;
      const bz = pt ? pt[1] : st.z;
      if (bx !== undefined) {
        mm.fillStyle = "#ffd23f";
        mm.beginPath(); mm.arc(px(bx), py(bz), 5, 0, 7); mm.fill();
      }
    }
    // Police.
    mm.fillStyle = "#ff4444";
    for (const u of G.police.units) {
      mm.beginPath(); mm.arc(px(u.mesh.position.x), py(u.mesh.position.z), 3, 0, 7); mm.fill();
    }
    // Safe houses (green dots at district centres).
    mm.fillStyle = "#39d353";
    for (const [x, z] of [[-90, 100], [150, 160], [0, -120]]) {
      mm.beginPath(); mm.arc(px(x), py(z), 2.5, 0, 7); mm.fill();
    }
    // Player arrow.
    const p = G.vehicles.player.pos;
    const h = G.vehicles.player.heading;
    mm.save();
    mm.translate(px(p.x), py(p.z));
    mm.rotate(Math.atan2(Math.sin(h), -Math.cos(h)) + Math.PI);
    mm.fillStyle = "#ffffff";
    mm.beginPath();
    mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath();
    mm.fill();
    mm.restore();
    // North marker.
    mm.fillStyle = "#ffffff";
    mm.font = "bold 10px monospace";
    mm.fillText("N", 4, 12);
  }

  function update(dt) {
    if (state.mode !== "playing") return;
    updateHUD();
    drawMinimap();
    // Wasted check.
    if (state.health <= 0 && state.mode === "playing") {
      state.mode = "wasted";
      showWasted();
    }
  }

  return {
    update, updateWanted, updateWeapon, updateObjective, updateHUD,
    banner, bark, toast, showStart, hideStart, showWasted, hideWasted,
    toggleGarage, drawMinimap,
  };
}
