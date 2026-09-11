# Kavir Dash — automation structure

This repo is a single-file HTML game (`dunedash.html`, "Kavir Dash" — a
Lori villager crossing the Zagros desert at dusk). This document records
the automated merge/deploy/asset-generation setup the repo owner asked
for, so future work follows the same pattern instead of re-deriving it.

## Branch model — no `main`, direct push, no PR gate

This repo has **no `main` branch**. The actual default branch — the only
one `deploy.yml` deploys from — is `claude/great-franklin-lxjopi`.

By the owner's explicit decision: changes are committed and **pushed
directly to `claude/great-franklin-lxjopi`**, with no feature branch, no
PR, and no review/approval step. A push there is automatically live.
Do not default back to opening a PR for changes to this repo — that was
considered and turned down in favor of direct push.

## Deploy pipeline

`.github/workflows/deploy.yml` triggers on push to `main` (legacy,
doesn't exist) and `claude/great-franklin-lxjopi`. It SCPs to a server
using the `SSH_HOST` / `SSH_USERNAME` / `SSH_PASSWORD` / `SSH_PORT` /
`SSH_TARGET_PATH` repo secrets:
- `dunedash.html`, copied both as itself and renamed to `index.html`.
- the whole `assets/` folder (recursively) — added because it was
  originally missing, which silently dropped the title-screen image.

**Any new asset directory must be added to this workflow's copy steps**,
or it will exist in the repo but never reach the live site.

## Asset generation pipelines

Two different generators, run two different ways — because their API
keys live in two different places.

### Cover / title art — Gemini Flash Image

- Key: `GEMINI_KEY`, set as an **environment variable inside the Claude
  Code session/environment** (not a GitHub secret — Actions runners don't
  have it).
- Run interactively in a Claude Code session:
  `GEMINI_KEY=... node scripts/generate-cover-art.mjs`
- Model: `gemini-3.1-flash-image`, `imageConfig: { aspectRatio: "16:9",
  imageSize: "1K" }`.
- Writes one file per art style into `scripts/out/cover-art/` (not
  committed). Review them, copy the chosen one into `assets/`, and point
  the relevant CSS `background-image`/`<img>` at it.
- To generate variants for a different scene, edit `BASE` and `STYLES` in
  the script — same brief, multiple art directions, so results are easy
  to compare side by side.

### Sound effects — ElevenLabs Sound Effects API

- Key: `ELEVENLABS_API_KEY`, stored as a **GitHub Actions repo secret**
  (Settings → Secrets and variables → Actions). Never paste a raw key in
  chat — if one is ever exposed that way, revoke/rotate it immediately.
- Runs as a GitHub Action: `.github/workflows/generate-sfx.yml`
  (`workflow_dispatch`, run it from the Actions tab against
  `claude/great-franklin-lxjopi`).
- The workflow runs `scripts/generate-sfx.mjs`, which calls
  `https://api.elevenlabs.io/v1/sound-generation` for each entry in its
  `SFX` array and writes `assets/audio/sfx/<id>.mp3`.
- The workflow commits and pushes the generated files itself. Since that
  push lands on `claude/great-franklin-lxjopi`, it chain-triggers
  `deploy.yml` — no manual step needed after the workflow finishes.
- To add a new sound effect: add an entry (`id`, `text` prompt,
  `duration_seconds`, `prompt_influence`) to the `SFX` array, then
  wire `sfx.play("<id>")` into the matching game event in
  `dunedash.html` (see the `sfx` module and its call sites for the
  existing pattern: jump, coin, throw, squish, hurt, gameover, win,
  click).

## Repeating this pattern for new assets

1. Decide which generator fits (Gemini for images, ElevenLabs for audio).
2. Add/extend a manifest (the `STYLES` or `SFX` array) rather than writing
   a one-off script.
3. Generate — interactively for Gemini, via the GitHub Action for
   ElevenLabs.
4. Commit the chosen output(s) directly to `claude/great-franklin-lxjopi`.
5. If the output lives in a new top-level folder, add it to
   `deploy.yml`'s copy steps.
6. Push — deploy runs automatically, nothing further to do.
