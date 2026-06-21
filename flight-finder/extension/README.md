# Flight Finder — Skyscanner Interceptor (Phase 1b)

A thin MV3 extension that captures Skyscanner's flight-search API responses (which
`chrome.webRequest` cannot read in MV3) by monkey-patching `fetch`/`XHR` in the
page's MAIN world, then relays them to the Flight Finder app, where
`normalizeSkyscanner` in `@flight-finder/core` maps them into the shared model.

This is the **second** data source (broadest coverage, incl. LCCs). Phase 1a uses
the Amadeus API in the web app and needs no extension.

## Load (development)

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Run a search on Skyscanner. Captures accumulate in `chrome.storage.local`
   (the toolbar badge shows the count). Inspect via the service-worker console.

## How it works

- `src/inject.main.js` — MAIN world; wraps `window.fetch` and `XMLHttpRequest`,
  matches Skyscanner search endpoints by URL hint + response shape, and
  `postMessage`s matching JSON.
- `src/content.js` — ISOLATED world; forwards messages to the service worker.
- `src/background.js` — de-dupes and stores captures; `// TODO` forward to the
  web app's ingest endpoint for normalization.

## ⚠️ Notes

- Intercepting Skyscanner violates its ToS — keep this scoped to **personal
  research**, not redistribution. The commercial path is the licensed Amadeus
  API in the web app.
- Skyscanner's internal endpoints change across releases; adjust the URL hints in
  `inject.main.js` using the Network tab if captures stop appearing.
