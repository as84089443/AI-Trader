const DEFAULT_INGEST = "http://localhost:3000/api/ingest";

const $ = (id) => document.getElementById(id);
const status = (msg) => {
  $("status").textContent = msg;
};

function webBase(ingestUrl) {
  try {
    return new URL(ingestUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}

async function load() {
  const { ingestUrl = DEFAULT_INGEST, captures = [] } =
    await chrome.storage.local.get({ ingestUrl: DEFAULT_INGEST, captures: [] });
  $("ingest").value = ingestUrl;
  $("count").textContent = String(captures.length);
}

$("save").addEventListener("click", async () => {
  const ingestUrl = $("ingest").value.trim() || DEFAULT_INGEST;
  await chrome.storage.local.set({ ingestUrl });
  status("已儲存 ✓");
});

$("flush").addEventListener("click", () => {
  status("送出中…");
  chrome.runtime.sendMessage({ type: "flush" }, (res) => {
    status(`已送出 ${res?.flushed ?? 0} 筆到網頁`);
  });
});

$("open").addEventListener("click", async () => {
  const { ingestUrl = DEFAULT_INGEST } = await chrome.storage.local.get({
    ingestUrl: DEFAULT_INGEST,
  });
  chrome.tabs.create({ url: `${webBase(ingestUrl)}/skyscanner` });
});

load();
