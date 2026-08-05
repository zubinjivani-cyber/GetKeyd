/* getkeyd - shared site chrome (header, nav, footer), written ONCE and injected
   into every page. To add/rename/reorder a menu link, edit the NAV list below -
   every page updates automatically.
   Each page needs, before app.js:
     <a ... skip link is added automatically>
     <header id="site-header"></header>   ... your content ...   <footer id="site-footer"></footer>
     <script src="layout.js"></script>   (or ../layout.js inside /pages/) */
(function () {
  var inPages = location.pathname.includes("/pages/");
  var root = inPages ? "../" : "";      // path back to the site root (index.html)
  var pg = inPages ? "" : "pages/";     // path into the /pages/ folder

  // [label, href] - add a line here to add a page to the menu everywhere.
  var NAV = [
    ["Home", root + "index.html"],
    ["Address Search", pg + "address.html"],
    ["Local Pros", pg + "pros.html"],
    ["Plan", pg + "plan.html"],
    ["Journey", pg + "journey.html"],
    ["Learn", pg + "learn.html"],
    ["Resources", pg + "resources.html"],
    ["Contact", pg + "contact.html"],
  ];

  var current = location.pathname.split("/").pop() || "index.html";
  var links = NAV.map(function (item) {
    var file = item[1].split("/").pop();
    var active = file === current ? " active" : "";
    return '<a href="' + item[1] + '" class="nav-btn' + active + '">' + item[0] + "</a>";
  }).join("");

  var header =
    '<header class="topbar"><div class="wrap">' +
      '<button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false">' +
        "<span></span><span></span><span></span></button>" +
      '<a href="' + root + 'index.html" class="brand">' +
        '<svg class="logo-mark" viewBox="0 0 48 48" width="30" height="30" aria-hidden="true">' +
          '<path d="M24 8 L40 21 V38 Q40 40 38 40 H10 Q8 40 8 38 V21 Z" fill="#7ba591"/>' +
          '<circle cx="24" cy="24" r="4.2" fill="#faf6f0"/>' +
          '<path d="M21.8 26.5 h4.4 l-1.1 7 h-2.2 Z" fill="#faf6f0"/>' +
        '</svg><span class="brand-name">getkeyd</span></a>' +
      '<nav class="nav" id="nav">' + links + "</nav>" +
    "</div></header>";

  var footer =
    '<footer class="footer"><div class="wrap">' +
      "<p>getkeyd — homeownership education. For guidance and education only; not financial advice.</p>" +
      '<p class="footer-links">' +
        '<a href="' + pg + 'privacy.html">Privacy Policy</a> &nbsp;·&nbsp; ' +
        '<a href="' + pg + 'terms.html">Terms of Service</a>' +
      "</p>" +
    "</div></footer>";

  // Accessibility: a "skip to content" link is the first focusable element.
  document.body.insertAdjacentHTML("afterbegin",
    '<a class="skip-link" href="#main">Skip to content</a>');

  var h = document.getElementById("site-header");
  if (h) h.outerHTML = header;
  var f = document.getElementById("site-footer");
  if (f) f.outerHTML = footer;

  /* ---------- Side-drawer navigation (all pages) ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const navEl = document.getElementById('nav');
  if (navToggle && navEl) {
    // Backdrop injected here so every page gets it without editing markup.
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    const setOpen = (open) => {
      navEl.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    navToggle.addEventListener('click', () => setOpen(!navEl.classList.contains('open')));
    overlay.addEventListener('click', () => setOpen(false));
    navEl.querySelectorAll('.nav-btn').forEach(l => l.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- Site-wide connection status indicator ---------- */
  var statusScript = document.createElement('script');
  statusScript.src = root + 'js/status.js';
  document.body.appendChild(statusScript);
})();
