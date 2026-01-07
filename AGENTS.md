# Agent Instructions

- For Hugging Face Kokoro TTS voices, use the `af_` prefix for female voices and the `am_` prefix for male voices (e.g., `af_heart`, `am_fenrir`).
- Netlify build note: functions are bundled as ESM because `netlify/functions/package.json` sets `"type": "module"`, so function handlers must use `export const handler = ...` (not `exports.handler`).
- Netlify build note: function dependencies like `firebase-admin` must be installed at the repo root so esbuild can resolve them; add to top-level `package.json` (and lockfile if present) to avoid "Could not resolve 'firebase-admin'" build failures.
