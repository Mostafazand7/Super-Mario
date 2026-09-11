#!/usr/bin/env node
// Generates cover/title-art variants via Gemini Flash Image. Unlike
// generate-sfx.mjs, this is meant to be run interactively in a Claude Code
// session (GEMINI_KEY lives in that environment, not as a GitHub secret —
// GitHub Actions runners have no access to it). See CLAUDE.md for the full
// asset-generation workflow.
//
// Usage: GEMINI_KEY=... node scripts/generate-cover-art.mjs
// Writes one file per style into scripts/out/cover-art/ — review them,
// copy the winner into assets/, and point the relevant CSS at it.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "out", "cover-art");

const API_KEY = process.env.GEMINI_KEY;
if (!API_KEY) {
  console.error("Missing GEMINI_KEY environment variable.");
  process.exit(1);
}

const MODEL = "gemini-3.1-flash-image";

// Edit BASE and STYLES to generate variants for a different scene; each
// style is rendered from the same BASE brief so results stay comparable.
const BASE =
  "A wide title-screen background illustration for a 2D desert platformer " +
  "video game called 'Kavir Dash'. Setting: the Zagros foothills in Iran at " +
  "dusk. A Lori villager character (wearing a traditional brown felt kolah " +
  "namadi conical hat, a dark chokha vest with rust-red trim, cream shirt, " +
  "red sash) is running and leaping across sand dunes. Scattered glowing " +
  "turquoise gemstones sit among the sand. A desert scorpion crawls nearby. " +
  "Weathered stone ruin columns rise from the dunes in the background. The " +
  "sky is a dusk gradient from deep indigo navy at the top through dusty " +
  "orange near the horizon, with a warm low sun. Strict color palette: deep " +
  "ink navy #101A2E, warm cream #FDECC8, sandy gold #E3B65C, rust red " +
  "#C1432B, bright gold #FFD34E, turquoise #1FA69A. No text, no logos, no " +
  "UI elements, no watermarks. Keep the upper third of the frame relatively " +
  "open/uncluttered sky so a game title logo can be overlaid later.";

const STYLES = [
  ["01_pixel_art", "Art style: crisp retro 16-bit pixel art (SNES-era side-scroller), dithered gradients, chunky pixel outlines, limited color blocking, no anti-aliasing blur."],
  ["02_gouache", "Art style: warm hand-painted gouache/watercolor illustration, soft visible brush texture, painterly warm light."],
  ["03_flat_vector", "Art style: flat minimalist vector illustration, bold simplified geometric shapes, clean flat color fields with only the sky gradient, poster-like composition."],
  ["04_cinematic", "Art style: cinematic realistic matte-painting, dramatic depth of field, atmospheric dust haze, epic adventure-game key art."],
  ["05_persian_miniature", "Art style: Persian miniature-inspired folk art, intricate decorative border patterning, stylized flattened perspective, rich jewel-tone accents."],
  ["06_isometric_lowpoly", "Art style: isometric low-poly 3D render, clean faceted geometry, soft ambient occlusion, stylized video game environment art."],
  ["07_comic_ink", "Art style: bold comic book / graphic novel illustration, thick black ink outlines, flat cel-shaded colors, dynamic action angle and heroic framing."],
  ["08_silhouette_poster", "Art style: minimalist dusk silhouette travel-poster, most foreground elements rendered as flat dark silhouettes against a vivid high-contrast sunset gradient."],
  ["09_premium_glow", "Art style: ultra-polished premium mobile-game key art, vibrant saturated colors, dramatic volumetric god-rays through dust, glowing rim light on every silhouette, painterly digital illustration, crisp high-contrast composition, trending game-store featured-art quality."],
];

async function generate(name, styleSuffix) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${BASE} ${styleSuffix}` }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${name}: HTTP ${res.status} ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData);
  if (!imagePart) throw new Error(`${name}: no image in response`);
  const ext = imagePart.inlineData.mimeType.includes("png") ? "png" : "jpg";
  const buf = Buffer.from(imagePart.inlineData.data, "base64");
  const outPath = path.join(OUT_DIR, `${name}.${ext}`);
  await writeFile(outPath, buf);
  console.log(`saved ${outPath} (${buf.length} bytes)`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const [name, style] of STYLES) {
    try {
      await generate(name, style);
    } catch (err) {
      console.error(err.message);
    }
  }
}

main();
