/* getkeyd - site-wide connection status indicator (dot + popover).
   Injected by layout.js on every page. Runs 3 health checks, paints a
   pulsing dot top-right (green/yellow/red), re-checks every 60s.
   Pairs with the CSS snippet in the status-dot section of styles.css.
   Note: data.wa.gov must be added to connect-src in every page CSP. */
(function () {
  if (window.__gkStatusLoaded) return; // guard: never double-init
  window.__gkStatusLoaded = true;

  var TIMEOUT_MS = 8000;
  var RECHECK_MS = 60000;
  var AUTH_WAIT_MS = 4000;

  var inPages = location.pathname.includes("/pages/");
  var running = false;
  var dot, panel;

  var CHECKS = [
    { name: "Server", id: "server" },
    { name: "WA L&I data", id: "data" },
    { name: "Auth (Firebase)", id: "auth" },
  ];

  function httpOk(url, method) {
    return fetch(url, { method: method || "HEAD", signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(function (res) { return res.status >= 200 && res.status < 400; })
      .catch(function () { return false; });
  }

  // Server: robots.txt (HEAD, GET fallback), else the local JSON data file.
  function checkServer() {
    var base = inPages ? "../" : "";
    var robots = base + "robots.txt";
    var dataFile = base + "data/wa-zip-lookup.json";
    return httpOk(robots, "HEAD").then(function (ok) {
      if (ok) return true;
      return httpOk(robots, "GET").then(function (ok2) {
        if (ok2) return true;
        return httpOk(dataFile, "HEAD");
      });
    });
  }

  // Data: WA L&I contractor registry (Socrata).
  function checkData() {
    return fetch(
      "https://data.wa.gov/resource/m8qx-ubtq.json?$select=contractorlicensestatus&$limit=1",
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    )
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  // Auth: ready flag set by auth.js; if auth.js isn't on the page, n/a.
  function checkAuth() {
    return new Promise(function (resolve) {
      if (window.__gkAuthReady === true) return resolve(true);
      if (!document.querySelector('script[src*="auth.js"]')) return resolve("n/a");
      var waited = 0;
      var timer = setInterval(function () {
        waited += 100;
        if (window.__gkAuthReady === true) {
          clearInterval(timer);
          resolve(true);
        } else if (waited >= AUTH_WAIT_MS) {
          clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  }

  function buildDot() {
    dot = document.createElement("button");
    dot.id = "status-dot";
    dot.className = "status-dot status-busy";
    dot.setAttribute("aria-label", "System status");
    dot.setAttribute("aria-busy", "true");
    dot.title = "Checking…";
    dot.innerHTML = '<span class="status-dot-core"></span>';
    document.body.appendChild(dot);
  }

  function buildPanel() {
    panel = document.createElement("div");
    panel.id = "status-panel";
    panel.className = "status-panel hidden";
    panel.setAttribute("aria-live", "polite");
    document.body.appendChild(panel);
  }

  function render(results) {
    var applicable = 0;
    var down = [];
    var i;
    for (i = 0; i < results.length; i++) {
      if (results[i] === "n/a") continue;
      applicable++;
      if (!results[i]) down.push(CHECKS[i].name);
    }
    var up = applicable - down.length;
    var state, title;
    if (down.length === 0) {
      state = "ok";
      title = "All systems connected";
    } else if (up > 0) {
      state = "warn";
      title = "Partial: " + up + " of " + applicable + " connected";
    } else {
      state = "down";
      title = "No connections";
    }
    if (down.length) title += " — Down: " + down.join(", ");

    dot.classList.remove("status-ok", "status-warn", "status-down", "status-busy");
    dot.classList.add("status-" + state);
    dot.setAttribute("aria-busy", "false");
    dot.title = title;

    var rows = "<h4>System status</h4>";
    for (i = 0; i < results.length; i++) {
      var mark, cls;
      if (results[i] === "n/a") { mark = "—"; cls = "na"; }
      else if (results[i]) { mark = "✓"; cls = "ok"; }
      else { mark = "✗"; cls = "bad"; }
      rows += '<div class="status-row"><span>' + CHECKS[i].name + "</span>" +
              '<span class="mark ' + cls + '">' + mark + "</span></div>";
    }
    panel.innerHTML = rows;
  }

  function runChecks() {
    if (running) return;
    running = true;
    dot.classList.add("status-busy");
    dot.setAttribute("aria-busy", "true");
    dot.title = "Checking…";
    Promise.all([checkServer(), checkData(), checkAuth()]).then(function (results) {
      running = false;
      render(results);
    });
  }

  function init() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }
    buildDot();
    buildPanel();
    dot.addEventListener("click", function () {
      panel.classList.toggle("hidden");
      runChecks();
    });
    document.addEventListener("click", function (e) {
      if (panel.classList.contains("hidden")) return;
      if (e.target === dot || dot.contains(e.target) || panel.contains(e.target)) return;
      panel.classList.add("hidden");
    });
    runChecks();
    setInterval(runChecks, RECHECK_MS);
  }

  init();
})();
