// Service worker: de-duplicate and persist captured Skyscanner payloads. A later
// iteration can POST these to the Flight Finder web app's ingest endpoint, where
// `normalizeSkyscanner` (in @flight-finder/core) maps them into the shared model.

const MAX_STORED = 50;
const seen = new Set();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "skyscanner-capture") return;

  // Cheap de-dupe by url + payload size.
  const sig = `${msg.url}:${JSON.stringify(msg.payload).length}`;
  if (seen.has(sig)) return;
  seen.add(sig);

  chrome.storage.local.get({ captures: [] }, (data) => {
    const captures = data.captures;
    captures.unshift({
      url: msg.url,
      capturedAt: msg.capturedAt,
      payload: msg.payload,
    });
    chrome.storage.local.set({ captures: captures.slice(0, MAX_STORED) });
    chrome.action?.setBadgeText?.({
      text: String(Math.min(captures.length, MAX_STORED)),
    });
  });

  // TODO (Phase 1b): forward to the web app for normalization, e.g.
  // const endpoint = (await chrome.storage.local.get({ ingestUrl: "" })).ingestUrl;
  // if (endpoint) fetch(endpoint, { method: "POST", body: JSON.stringify(msg) });
});
