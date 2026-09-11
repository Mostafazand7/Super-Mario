#!/usr/bin/env node
// Generates the Kavir Dash sound-effect set (and the Lori-style background
// theme) via the ElevenLabs Sound Effects API. Run in CI (see
// .github/workflows/generate-sfx.yml) with ELEVENLABS_API_KEY set as a
// secret — never hardcode a key here.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, "..", "assets", "audio");

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY environment variable.");
  process.exit(1);
}

const SFX = [
  {
    id: "jump",
    text: "Short retro 8-bit video game jump sound, quick upward pitch swoop, playful arcade platformer, no voice, no music",
    duration_seconds: 0.4,
    prompt_influence: 0.65,
  },
  {
    id: "coin",
    text: "Bright short chime, two quick ascending bell-like notes, collecting a turquoise gem in a retro platformer video game, no voice, no music",
    duration_seconds: 0.5,
    prompt_influence: 0.65,
  },
  {
    id: "throw",
    text: "Quick whoosh of a small stone being thrown through dry desert air, retro platformer video game sound effect, no voice, no music",
    duration_seconds: 0.4,
    prompt_influence: 0.6,
  },
  {
    id: "squish",
    text: "Short crunchy squash sound, a desert scorpion being stomped or hit in a retro video game, no voice, no music",
    duration_seconds: 0.4,
    prompt_influence: 0.6,
  },
  {
    id: "hurt",
    text: "Short descending 8-bit video game hurt/damage sound, low thud with a dissonant buzz, no voice, no music",
    duration_seconds: 0.5,
    prompt_influence: 0.6,
  },
  {
    id: "gameover",
    text: "Somber short descending arcade game-over jingle, three low falling notes, desert folk instrumentation feel, no voice",
    duration_seconds: 1.6,
    prompt_influence: 0.55,
  },
  {
    id: "win",
    text: "Short triumphant ascending arcade fanfare, three bright rising notes celebrating reaching a checkpoint flag, folk percussion flavor, no voice",
    duration_seconds: 1.6,
    prompt_influence: 0.55,
  },
  {
    id: "click",
    text: "Tiny soft UI click/tap sound for a video game menu button, no voice, no music",
    duration_seconds: 0.2,
    prompt_influence: 0.6,
  },
  {
    id: "theme",
    dir: "music",
    text: "Traditional Lori (Lorestani/Bakhtiari) Iranian folk instrumental music, ney reed flute carrying the melody over tanbur and daf frame drum, driving 6/8 dance rhythm, Phrygian-dominant scale, warm dusk-in-the-Zagros-mountains atmosphere, no vocals, no singing, seamlessly loopable, studio quality",
    duration_seconds: 22,
    prompt_influence: 0.3,
    loop: true,
  },
];

async function generate(sfx) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: sfx.text,
      duration_seconds: sfx.duration_seconds,
      prompt_influence: sfx.prompt_influence,
      ...(sfx.loop ? { loop: true } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${sfx.id}: HTTP ${res.status} ${body.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outDir = path.join(AUDIO_DIR, sfx.dir || "sfx");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${sfx.id}.mp3`);
  await writeFile(outPath, buf);
  console.log(`saved ${outPath} (${buf.length} bytes)`);
}

async function main() {
  let failed = false;
  for (const sfx of SFX) {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        await generate(sfx);
        ok = true;
      } catch (err) {
        console.error(`Attempt ${attempt} failed for ${sfx.id}: ${err.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    if (!ok) failed = true;
  }
  if (failed) process.exitCode = 1;
}

main();
