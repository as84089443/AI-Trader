# Flight Finder — Skyscanner Interceptor (Phase 1b)

A thin MV3 extension that captures Skyscanner's flight-search API responses (which
`chrome.webRequest` cannot read in MV3) by monkey-patching `fetch`/`XHR` in the
page's MAIN world, then relays them to the Flight Finder app, where
`normalizeSkyscanner` in `@flight-finder/core` maps them into the shared model.

This is the **second** data source (broadest coverage, incl. LCCs). Phase 1a uses
the Amadeus API in the web app and needs no extension.

## Load + connect to the web app

1. Start the web app: `pnpm dev` (from the repo root) → http://localhost:3000
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select this `extension/` folder.
4. Click the extension icon → set **網頁接收網址** to
   `http://localhost:3000/api/ingest` → **儲存**.
5. Run a search on Skyscanner. Each captured response is forwarded to the web app
   and appears at **http://localhost:3000/skyscanner** (same comparison table +
   Trip.com booking links). The popup's **送出全部** re-sends anything stored
   while the web app was offline; **開啟比價網頁** opens `/skyscanner`.

## How it works

- `src/inject.main.js` — MAIN world; wraps `window.fetch` and `XMLHttpRequest`,
  matches Skyscanner search endpoints by URL hint + response shape, and
  `postMessage`s matching JSON.
- `src/content.js` — ISOLATED world; forwards messages to the service worker.
- `src/background.js` — de-dupes, stores, and **POSTs each capture to the web
  app's `/api/ingest`** (URL configured in the popup, default localhost:3000).
- `src/popup.html` / `popup.js` — configure the ingest URL, show the capture
  count, flush stored captures, open the results page.

The web side (`apps/web`) normalizes payloads with `normalizeSkyscanner` and
serves them at `/skyscanner`.

## ⚠️ Notes

- Intercepting Skyscanner violates its ToS — keep this scoped to **personal
  research**, not redistribution. The commercial path is the licensed Amadeus
  API in the web app.
- Skyscanner's internal endpoints change across releases; adjust the URL hints in
  `inject.main.js` using the Network tab if captures stop appearing.
