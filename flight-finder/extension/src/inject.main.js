// Runs in the page's MAIN world (Chrome 111+). MV3's chrome.webRequest cannot
// read response bodies, so we monkey-patch fetch + XHR to capture Skyscanner's
// internal search responses and postMessage them to the ISOLATED content script.

(() => {
  const TAG = "FF_SKYSCANNER_CAPTURE";

  // Heuristic: Skyscanner search/pricing endpoints change across releases, so we
  // match on URL hints AND on a response shape that looks like flight results.
  const URL_HINTS = [/conductor/i, /\/search/i, /flights/i, /itiner/i, /pricing/i];

  function urlLooksInteresting(url) {
    return typeof url === "string" && URL_HINTS.some((re) => re.test(url));
  }

  function payloadLooksLikeFlights(obj) {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj).join(",").toLowerCase();
    return /itinerar|legs|pricing|fareresult|flightquotes/.test(keys);
  }

  function relay(url, text) {
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }
    if (!payloadLooksLikeFlights(json)) return;
    window.postMessage({ source: TAG, url, payload: json }, "*");
  }

  // --- patch fetch ---
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      if (urlLooksInteresting(url)) {
        res
          .clone()
          .text()
          .then((t) => relay(url, t))
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return res;
  };

  // --- patch XHR ---
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__ff_url = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      try {
        if (urlLooksInteresting(this.__ff_url) && typeof this.responseText === "string") {
          relay(this.__ff_url, this.responseText);
        }
      } catch {
        /* ignore */
      }
    });
    return origSend.apply(this, args);
  };

  console.debug("[Flight Finder] Skyscanner interceptor active");
})();
