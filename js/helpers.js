/* getkeyd - shared helpers, loaded before all other scripts.
   One copy per helper: auth.js, app.js, address-lookup.js, and compare.js
   previously each shipped their own. */

// HTML-escape user-controlled strings before inserting into innerHTML.
function escapeHtml(s) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(s || ""));
  return div.innerHTML;
}

// USD formatting: Intl.NumberFormat beats '$' + Math.round(n).toLocaleString.
const money = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format;

// Per-user storage namespace so each account keeps its own progress.
// auth.js caches the signed-in user's uid; logged-out visitors use "guest".
function uidPrefix() {
  const uid = localStorage.getItem("getkeyd.currentUid") || "guest";
  return "getkeyd.u." + uid + ".";
}

// fetch with timeout: AbortSignal.timeout is the stdlib way (no hand-rolled AbortController).
async function fetchJSON(url, opts, ms) {
  const res = await fetch(url, Object.assign({}, opts, {
    signal: (opts && opts.signal) || AbortSignal.timeout(ms || 12000),
  }));
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
