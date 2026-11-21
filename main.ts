// Entrypoint for the make.fun "best spot-the-difference game" entry.
// Copies the static game + screenshots into $MAKEFUN_OUTPUT_DIR and
// writes the dossier.json the kit validates against.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

const gameDir = join(root, 'game');
cpSync(gameDir, join(out, 'game'), { recursive: true });

const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// buildDossier returns the serialized dossier bytes (Uint8Array) — write them as-is.
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`Entry assembled in ${out}`);
