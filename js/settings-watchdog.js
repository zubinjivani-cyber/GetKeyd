// If Firebase auth never initializes, don't hang on "Loading…" forever.
setTimeout(function () {
  if (window.__gkAuthReady) return;
  var l = document.getElementById('settings-loading');
  if (l) l.innerHTML = "We couldn't load your account — this usually means a connection problem. " +
    "Please check your internet and <a href=\"index.html\">return home</a> or <a href=\"login.html\">log in</a> again.";
}, 8000);
