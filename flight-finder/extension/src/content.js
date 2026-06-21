// ISOLATED world. Receives captured payloads from the MAIN-world interceptor via
// window.postMessage and forwards them to the service worker.

const TAG = "FF_SKYSCANNER_CAPTURE";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== TAG) return;
  chrome.runtime.sendMessage({
    type: "skyscanner-capture",
    url: data.url,
    payload: data.payload,
    capturedAt: Date.now(),
  });
});
