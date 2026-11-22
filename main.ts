// Aurora Falls — entry program for make.fun's "Make GTA 6" bounty (gta6-01).
// Copies this repository's game/ and screenshots/ into the output directory
// and writes /output/dossier.json with the kit's buildDossier.
//
// The program resolves every path from its own location (import.meta.url), so
// it works no matter which directory the grader runs it from, and writes to
// MAKEFUN_OUTPUT_DIR when the grader provides it (falling back to /output).
// It is deterministic: two runs write byte-identical output.
import { buildDossier } from "./vendor/makefun-game.ts";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir: string = dirname(fileURLToPath(import.meta.url));
const repoRoot: string = resolve(scriptDir);
const outDir: string = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : resolve("/output");

const gameSrc: string = resolve(repoRoot, "game");
const shotsSrc: string = resolve(repoRoot, "screenshots");

if (!existsSync(gameSrc)) {
  throw new Error(`Aurora Falls: game/ not found next to main.ts (${gameSrc})`);
}
if (!existsSync(shotsSrc)) {
  throw new Error(
    `Aurora Falls: screenshots/ not found next to main.ts (${shotsSrc})`,
  );
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(gameSrc, resolve(outDir, "game"), { recursive: true });
cpSync(shotsSrc, resolve(outDir, "screenshots"), { recursive: true });
const copiedGame = readdirSync(resolve(outDir, "game")).length;
const copiedShots = readdirSync(resolve(outDir, "screenshots")).length;
console.log(`Aurora Falls: copied ${copiedGame} game entries, ${copiedShots} screenshots`);

const dossier: Uint8Array = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(resolve(outDir, "dossier.json"), dossier);

console.log(
  `Aurora Falls: wrote ${resolve(outDir, "dossier.json")} (${dossier.length} bytes)`,
);
