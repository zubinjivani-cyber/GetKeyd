/* getkeyd - auth gate (shared by every gated page).
   Runs in <head>: adds .auth-gate immediately so gated pages stay hidden
   until auth.js resolves (no flash of gated content), and adds .is-member
   on the home page for signed-in users (no flash of the guest view).
   If auth.js never initializes, redirect to login. */
(function () {
  var login = location.pathname.includes("/pages/") ? "../login.html" : "login.html";
  var uid = null;
  try { uid = localStorage.getItem("getkeyd.currentUid") || ""; } catch (e) {}
  if (uid) document.documentElement.classList.add("is-member");
  else document.documentElement.classList.add("auth-gate");
  setTimeout(function () {
    if (!window.__gkAuthReady) location.replace(login);
  }, 8000);
})();
