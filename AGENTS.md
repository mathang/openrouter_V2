# Agent Instructions

- For Hugging Face Kokoro TTS voices, use the `af_` prefix for female voices and the `am_` prefix for male voices (e.g., `af_heart`, `am_fenrir`).
- Netlify build note: functions are bundled as ESM because `netlify/functions/package.json` sets `"type": "module"`, so function handlers must use `export const handler = ...` (not `exports.handler`).
- Netlify build note: function dependencies like `firebase-admin` must be installed at the repo root so esbuild can resolve them; add to top-level `package.json` (and lockfile if present) to avoid "Could not resolve 'firebase-admin'" build failures.
- Conversation exports use the browser print dialog (`window.print()`) for cross-device compatibility; avoid file-download exports since they fail on some Android browsers.

## Key decisions and lessons learned

- Decision: Prefer ESM syntax for Netlify functions to align with `netlify/functions/package.json` and prevent handler export mismatches.
- Decision: Centralize serverless function dependencies at the repo root so Netlify’s esbuild can resolve them during bundling.
- Decision: Use `window.print()` for conversation exports to avoid unreliable file-download flows on mobile browsers.

## Common errors and resolutions

- Error: Netlify function fails with `exports.handler is not defined`.
  Resolution: Switch to ESM format and use `export const handler = ...` in function files.
- Error: Build fails with "Could not resolve 'firebase-admin'".
  Resolution: Install `firebase-admin` at the repository root and update the root `package.json` (and lockfile if present).
- Error: Conversation export fails on Android browsers.
  Resolution: Use the print dialog (`window.print()`) instead of file download.
