// Service worker: de-duplicate captured Skyscanner payloads, persist them, and
// forward each to the Flight Finder web app's /api/ingest endpoint, where
// `normalizeSkyscanner` (@flight-finder/core) maps them into the shared model.

const MAX_STORED = 50;
const DEFAULT_INGEST = "http://localhost:3000/api/ingest";
const seen = new Set();

async function getIngestUrl() {
  const { ingestUrl } = await chrome.storage.local.get({
    ingestUrl: DEFAULT_INGEST,
  });
  return ingestUrl;
}

async function forward(url, payload) {
  const ingestUrl = await getIngestUrl();
  if (!ingestUrl) return;
  try {
    await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, payload }),
    });
  } catch (e) {
    console.warn("[Flight Finder] forward failed:", e);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Popup asks to re-send everything we've stored.
  if (msg?.type === "flush") {
    chrome.storage.local.get({ captures: [] }, async (data) => {
      for (const c of data.captures) await forward(c.url, c.payload);
      sendResponse({ flushed: data.captures.length });
    });
    return true; // async response
  }

  if (msg?.type !== "skyscanner-capture") return;

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

  forward(msg.url, msg.payload);
});
