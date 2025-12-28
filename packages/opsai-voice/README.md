# OpsAI Voice Console

The OpsAI Voice Console is a lightweight browser experience that lets operators ask for summaries, health updates, and deployments while the page reads answers aloud using the Web Speech API.

## How to run it

1. `pnpm --dir packages/opsai-voice run build` compiles the TypeScript under `src` and copies `public/*` into `dist/voice-console/`.
2. Host `dist/voice-console/index.html` with any static server (`npx serve dist/voice-console` or mount it under the main Next app) so buttons and scripts can hit the Ops APIs.
3. During development, keep `pnpm --dir packages/opsai-voice run dev` running to rebuild while you edit the TypeScript sources, and run `pnpm --dir packages/opsai-voice run clean` if you need to wipe the dist output.

## Audio I/O assumptions

- The scripts in `src/voice.ts` call `window.speechSynthesis` and `SpeechSynthesisUtterance`, so the console assumes a Chromium-based browser with Web Speech enabled.
- Buttons call `safeJson` helpers that `fetch` JSON, and the live “Subscribe” button opens an `EventSource`, so the host must allow SSE streams and regular fetch traffic.
- There is no microphone input; all interactions are outbound fetches or SSE updates, and the voice output is always read aloud.

## API endpoints

- `GET /api/ops/summary`
- `GET /api/ops/health`
- `GET /api/ops/deployments`
- `GET /api/ops/events/stream` (SSE)

## Status

Status: Not production-ready (proof-of-concept narrator for internal Ops pilots).
