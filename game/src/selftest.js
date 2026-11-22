// Aurora Falls — screenshot scenes and the automated play-test.
// ?scene=chase|race|heist|downtown stages a poster shot of the live game.
// ?selftest=1 drives, shoots, triggers wanted and plays mission 1 end to
// end, then reports window.__TEST__.
export function createSelftest(G) {
  const state = G.state;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Wait until the game's own clock advances by `sec` (the render loop can
  // run far below real time under software rendering, so fixed sleeps lie).
  async function waitGame(sec) {
    const t0 = state.time;
    const deadline = Date.now() + 60000;
    while (state.time - t0 < sec) {
      if (Date.now() > deadline) break;
      await sleep(120);
    }
  }

  function startPlaying() {
    state.mode = "playing";
    G.ui.hideStart();
    G.audio.resume();
    G.audio.setStation(state.radioStation);
  }

  function applyScene(name) {
    state.scene = name;
    state.dayTime = 0.86; // deep night, aurora strongest
    const p = G.vehicles.player;
    if (name === "chase") {
      p.pos.set(0, 0, 130);
      p.heading = Math.PI; // north, into downtown
      p.speed = 10;
      startPlaying();
      G.police.addWanted(3, "AFPD cordon closing in");
      // Roadblock + spike strip ahead of the player (player drives toward -z).
      G.police.placeRoadblockAhead(32);
      G.police.placeSpikeStrip(20);
      // Swing NORTHERN-1 straight ahead and far out so the searchlight is in frame.
      G.police.setHeliPhase(-1.97);
      G.police.setHeliRadius(90);
      G.police.setHeliHeight(30);
      state.objective = "Whiteout Chase: lose the AFPD cordon";
      G.ui.updateObjective();
      G.ui.bark("June: Roadblock ahead — Maya, find us a gap.", "JUNE");
    } else if (name === "race") {
      p.pos.set(-40, 0, -210);
      p.heading = Math.PI / 2; // east across the lake
      p.speed = 0;
      startPlaying();
      // Line three rivals up on the lake ring for the ice-road race.
      const rivals = G.vehicles.traffic.filter((t) => t.alive).slice(0, 3);
      const spots = [[-52, -202], [-52, -214], [-52, -226]];
      rivals.forEach((t, i) => {
        t.route = { pts: [[-60, -210], [60, -210], [60, -150], [-60, -150]], speed: 13 + i * 2 };
        t.seg = 0;
        t.mesh.position.set(spots[i][0], 0, spots[i][1]);
      });
      G.missions.startMission(7);
      state.objective = "The Long Night: ice-road race across the frozen lake";
      G.ui.updateObjective();
    } else if (name === "heist") {
      p.pos.set(190, 0, 222);
      p.heading = Math.PI; // north, up the piste toward the cable car station
      p.speed = 0;
      startPlaying();
      G.missions.startMission(2);
      G.ui.bark("Dario: Safe house above the piste. Cameras looped.", "DARIO");
    } else if (name === "downtown") {
      p.pos.set(0, 0, 110);
      p.heading = Math.PI;
      p.speed = 10;
      startPlaying();
      state.objective = "Neon Downtown — explore Aurora Falls";
      G.ui.updateObjective();
    }
  }

  async function runSelftest() {
    const results = { drive: false, shoot: false, wanted: false, heli: false, mission: false, errors: [] };
    try {
      startPlaying();
      await waitGame(0.5);
      // 1. Drive: hold W for ~2.5 game-seconds.
      G.input.keys.add("KeyW");
      await waitGame(2.5);
      G.input.keys.delete("KeyW");
      results.drive = state.speedKmh > 5 || state.stats.distance > 20;
      // 2. Shoot: five aimed shots at traffic ahead.
      for (let i = 0; i < 5; i++) {
        G.combat.shoot();
        await waitGame(0.35);
      }
      results.shoot = state.stats.shots >= 5;
      // 3. Wanted: trigger 3 stars, helicopter must arrive.
      G.police.addWanted(3, "selftest");
      await waitGame(1);
      results.wanted = state.wanted >= 3 && G.police.units.length > 0;
      results.heli = !!G.police.heli;
      // 4. Mission 1 start to finish through the real paths.
      G.missions.startMission(1);
      await waitGame(0.4);
      // Steal a plow for real: walk up to one and jack it.
      const plow = G.vehicles.plows[0];
      if (plow) {
        G.vehicles.player.pos.set(plow.mesh.position.x + 2, 0, plow.mesh.position.z);
        state.onFoot = true;
        G.vehicles.carjack();
      } else {
        G.vehicles.player.kind = "plow";
        state.onFoot = false;
      }
      await waitGame(0.5);
      // Drive the stage checkpoints (teleport = fast-forward, same reach check).
      G.vehicles.player.pos.set(0, 0, 200);
      await waitGame(0.5);
      G.vehicles.player.pos.set(10, 0, 340);
      await waitGame(0.6);
      results.mission = state.missionsDone.includes(1);
    } catch (e) {
      results.errors.push(String(e && e.message ? e.message : e));
    }
    results.errors = results.errors.concat(state.errors);
    results.shots = state.stats.shots;
    results.missionsDone = state.missionsDone.slice();
    window.__TEST__ = results;
    console.log("SELFTEST " + JSON.stringify(results));
    return results;
  }

  return { applyScene, runSelftest, startPlaying };
}
