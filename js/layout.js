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

  // [label, href, svg] - add a line here to add a page to the menu everywhere.
  // svg is the icon markup (1-2 stroke paths, 24x24 viewBox) injected left of the label.
  var NAV = [
    ["Home", root + "index.html",
      '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'],
    ["Address Search", pg + "address.html",
      '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'],
    ["Local Pros", pg + "pros.html",
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    ["Plan", pg + "plan.html",
      '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="8" y2="16"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="16" y1="12" x2="16" y2="16"/>'],
    ["Journey", pg + "journey.html",
      '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h6"/>'],
    ["Learn", pg + "learn.html",
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'],
    ["Resources", pg + "resources.html",
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
    ["Contact", pg + "contact.html",
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'],
  ];

  var current = location.pathname.split("/").pop() || "index.html";
  var links = NAV.map(function (item) {
    var file = item[1].split("/").pop();
    var active = file === current ? " active" : "";
    return (
      '<a href="' + item[1] + '" class="nav-btn' + active + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      item[2] + "</svg><span>" + item[0] + "</span></a>"
    );
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
