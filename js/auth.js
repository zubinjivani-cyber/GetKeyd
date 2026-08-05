// getkeyd auth - Firebase Authentication via CDN modules (no bundler needed).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, reload, updateProfile,
  updatePassword, verifyBeforeUpdateEmail, EmailAuthProvider,
  reauthenticateWithCredential, reauthenticateWithPopup, deleteUser,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQoisy2OO5pPzTUP4iI5G41m8aDtwxEzY",
  authDomain: "getkeyd-c259c.firebaseapp.com",
  projectId: "getkeyd-c259c",
  storageBucket: "getkeyd-c259c.firebasestorage.app",
  messagingSenderId: "55589195554",
  appId: "1:55589195554:web:d51217bf0b4b647a155f7b",
  measurementId: "G-VQENRRWMTH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// After clicking the verification link, users land back on getkeyd (not Firebase).
// Use the current origin so this works both on getkeyd.app and localhost in dev.
const actionCodeSettings = { url: location.origin + "/login.html", handleCodeInApp: false };
async function sendVerification(user) {
  try {
    await sendEmailVerification(user, actionCodeSettings);
  } catch (err) {
    // If the continue URL's domain isn't an authorized Firebase domain, still send
    // the email (just without the custom return link) rather than failing outright.
    if (err.code === "auth/unauthorized-continue-uri" || err.code === "auth/invalid-continue-uri") {
      await sendEmailVerification(user);
    } else {
      throw err;
    }
  }
}

// Pages inside /pages/ need to step up one level for links.
const base = location.pathname.includes("/pages/") ? "../" : "";

// Pages anyone can view logged out. Everything else requires a verified account.
const PUBLIC_PAGES = ["index.html", "login.html", "privacy.html", "terms.html", "404.html"];
const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();
const isPublicPage = PUBLIC_PAGES.includes(currentFile);

/* ---------- Auth-aware nav (all pages) ---------- */
const logout = () => signOut(auth).then(() => location.replace(base + "login.html"));
const nav = document.getElementById("nav");
function renderAuthNav(user) {
  if (!nav) return;
  nav.querySelectorAll(".auth-added").forEach((e) => e.remove());
  if (user && user.emailVerified) {
    const out = document.createElement("a");
    out.className = "nav-btn auth-added auth-nav";
    out.textContent = "Log out";
    out.href = "#";
    out.onclick = (e) => { e.preventDefault(); logout(); };
    nav.appendChild(out);
  } else {
    const login = document.createElement("a");
    login.className = "nav-btn auth-added auth-nav";
    login.textContent = "Log in";
    login.href = base + "login.html";
    nav.appendChild(login);
  }
}

/* ---------- Friendly error messages ---------- */
function messageFor(code) {
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account with that email already exists. Try logging in.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the popup. Please allow popups and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled. Please contact support.",
    "auth/requires-recent-login": "Please log in again to complete this change.",
    "auth/no-email": "We couldn't verify your identity for this account. Please contact support.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

/* ---------- Login page logic (only on login.html) ---------- */
const authForm = document.getElementById("auth-form");
if (authForm) {
  const emailEl = document.getElementById("auth-email");
  const passEl = document.getElementById("auth-password");
  const errorEl = document.getElementById("auth-error");
  const submitBtn = document.getElementById("auth-submit");
  const titleEl = document.getElementById("auth-title");
  const subEl = document.getElementById("auth-sub");
  const toggleWrap = document.getElementById("auth-toggle-text");
  const googleBtn = document.getElementById("google-signin");
  let mode = "login"; // or "signup"

  const showError = (msg) => { errorEl.textContent = msg; errorEl.classList.remove("hidden"); };
  const clearError = () => { errorEl.textContent = ""; errorEl.classList.add("hidden"); };

  const applyMode = () => {
    const uf = document.getElementById("username-field");
    const ui = document.getElementById("auth-username");
    if (uf && ui) {
      if (mode === "signup") { uf.classList.remove("hidden"); ui.setAttribute("required", "required"); }
      else { uf.classList.add("hidden"); ui.removeAttribute("required"); }
    }
    if (mode === "login") {
      titleEl.textContent = "Welcome back";
      subEl.textContent = "Log in to pick up where you left off.";
      submitBtn.textContent = "Log in";
      toggleWrap.innerHTML = `Don't have an account? <a href="#" id="auth-toggle">Sign up</a>`;
    } else {
      titleEl.textContent = "Create your account";
      subEl.textContent = "Save your progress and goals across devices.";
      submitBtn.textContent = "Sign up";
      toggleWrap.innerHTML = `Already have an account? <a href="#" id="auth-toggle">Log in</a>`;
    }
    document.getElementById("auth-toggle").addEventListener("click", (e) => {
      e.preventDefault();
      mode = mode === "login" ? "signup" : "login";
      clearError();
      applyMode();
    });
  };
  applyMode();

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = "Please wait…";
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
        const uname = (document.getElementById("auth-username")?.value || "").trim();
        if (uname) await updateProfile(cred.user, { displayName: uname });
      }
      // onAuthStateChanged below routes verified users on, or shows the verify screen,
      // which sends the verification email (covering signup and re-login alike).
    } catch (err) {
      showError(messageFor(err.code));
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  googleBtn.addEventListener("click", async () => {
    clearError();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      showError(messageFor(err.code));
    }
  });

  // Forgot password — toggles the login form out and the reset form in.
  function setForgotMode(on) {
    document.getElementById("forgot-pw-section").classList.toggle("hidden", !on);
    ["auth-form", "google-signin", "auth-toggle-text", "auth-title"].forEach((id) => (document.getElementById(id).style.display = on ? "none" : ""));
    document.querySelectorAll(".auth-divider").forEach((el) => (el.style.display = on ? "none" : ""));
    document.getElementById("forgot-pw-link").parentElement.style.display = on ? "none" : "";
    if (on) document.getElementById("auth-error").classList.add("hidden");
    else {
      document.getElementById("forgot-pw-error").classList.add("hidden");
      document.getElementById("forgot-pw-success").classList.add("hidden");
      document.getElementById("forgot-pw-email").value = "";
    }
  }
  document.getElementById("forgot-pw-link").addEventListener("click", (e) => {
    e.preventDefault();
    setForgotMode(true);
  });
  document.getElementById("forgot-pw-back").addEventListener("click", (e) => {
    e.preventDefault();
    setForgotMode(false);
  });
  document.getElementById("forgot-pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-pw-email").value;
    const errorEl = document.getElementById("forgot-pw-error");
    const successEl = document.getElementById("forgot-pw-success");
    const btn = e.target.querySelector("button");
    if (!btn) return;
    const label = btn.textContent;
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try {
      await sendPasswordResetEmail(auth, email);
      successEl.textContent = "Check your inbox! We sent a reset link.";
      successEl.classList.remove("hidden");
      e.target.reset();
    } catch (err) {
      errorEl.textContent = messageFor(err.code);
      errorEl.classList.remove("hidden");
    }
    btn.disabled = false;
    btn.textContent = label;
  });

  // "Please verify your email" screen.
  const takeRedirect = () => {
    try {
      const r = sessionStorage.getItem("getkeyd.redirectAfterLogin");
      sessionStorage.removeItem("getkeyd.redirectAfterLogin");
      if (!r) return null;
      const u = new URL(r, location.href);
      if (u.origin === location.origin) return u.href;
      return null;
    } catch (_) { return null; }
  };
  function showVerify(user) {
    const card = document.querySelector(".auth-card");
    if (!card) return;
    card.innerHTML = `
      <div class="auth-logo">✉️</div>
      <h2>Verify your email</h2>
      <p class="sub">We sent a verification link to <strong>${escapeHtml(user.email)}</strong>. Open it, then come back and continue.</p>
      <div id="verify-msg" class="auth-error hidden"></div>
      <button class="btn primary" id="verify-continue">I've verified — continue</button>
      <button class="btn btn-google" id="verify-resend">Resend email</button>
      <p class="auth-alt"><a href="#" id="verify-signout">Use a different account</a></p>`;
    const msg = card.querySelector("#verify-msg");
    const note = (t, ok) => {
      msg.textContent = t;
      msg.classList.toggle("ok", !!ok);
      msg.classList.remove("hidden");
    };
    card.querySelector("#verify-continue").onclick = async () => {
      await reload(user);
      if (auth.currentUser && auth.currentUser.emailVerified) {
        const redir = takeRedirect();
        if (redir) location.replace(redir);
        else location.replace(base + "index.html");
      } else {
        note("Not verified yet. Check your inbox (and spam), click the link, then try again.", false);
      }
    };
    card.querySelector("#verify-resend").onclick = async () => {
      try { await sendVerification(user); note("Verification email sent again.", true); }
      catch (err) { note(messageFor(err.code), false); }
    };
    card.querySelector("#verify-signout").onclick = (e) => {
      e.preventDefault();
      signOut(auth).then(() => location.reload());
    };

    // Auto-send on first arrival at this screen (once per session, per account) so
    // signup and re-login both get the email without clicking Resend.
    const sentKey = "getkeyd.verifySent." + user.uid;
    try {
      if (!sessionStorage.getItem(sentKey)) {
        sessionStorage.setItem(sentKey, "1");
        sendVerification(user)
          .then(() => note(`Verification email sent to ${user.email}.`, true))
          .catch((err) => { try { sessionStorage.removeItem(sentKey); } catch (_) {} note(messageFor(err.code), false); });
      }
    } catch (_) {}
  }

  // Route: verified users go to the dashboard (or redirected-back page), unverified see the verify screen.
  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    if (user.emailVerified) {
      const redir = takeRedirect();
      if (redir) location.replace(redir);
      else location.replace(base + "index.html");
    } else showVerify(user);
  });
}

/* ---------- Progress + dashboard ---------- */
const progPrefix = (uid) => "getkeyd.u." + uid + ".";
function journeyStats(uid) {
  const pre = progPrefix(uid) + "step.";
  let done = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(pre) && localStorage.getItem(k) === "1") done++;
  }
  return { done, total: JOURNEY_TOTAL, pct: Math.round((done / JOURNEY_TOTAL) * 100) };
}
function savingsStats(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(progPrefix(uid) + "savings") || "null");
    if (!v || !v.price || !v.goalpct || !v.current) return null;
    const goal = v.price * (v.goalpct / 100);
    const pct = goal > 0 ? Math.min(100, Math.round((v.current / goal) * 100)) : 0;
    return { goal, current: v.current, pct };
  } catch (_) { return null; }
}
function ringSVG(pct, color) {
  const C = 2 * Math.PI * 52;
  const off = C * (1 - pct / 100);
  return `<svg class="ring" width="120" height="120" viewBox="0 0 120 120">
    <circle class="ring-track" cx="60" cy="60" r="52"></circle>
    <circle class="ring-fill" cx="60" cy="60" r="52" style="stroke:${color};--off:${off.toFixed(1)}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"></circle>
    <text class="ring-pct" x="60" y="68" text-anchor="middle">${pct}%</text>
  </svg>`;
}
function firstName(user) {
  return (user.displayName || user.email || "there").split(" ")[0].split("@")[0];
}

// Avatar sources, in priority order:
//  1. An uploaded photo (compressed data URL stored locally, per account)
//  2. photoURL — "emoji:🏡", an https image URL
//  3. Fallback to the first initial
const photoKey = (uid) => progPrefix(uid) + "photo";
function avatarMarkup(user) {
  const attrSafe = (s) => String(s || "").replace(/["'<>]/g, "");
  if (user && user.uid) {
    try {
      const up = localStorage.getItem(photoKey(user.uid));
      if (up && /^data:image\//.test(up)) return `<img src="${attrSafe(up)}" alt="" />`;
    } catch (_) {}
  }
  const p = user.photoURL || "";
  if (p.startsWith("emoji:")) return `<span class="av-emoji">${attrSafe(p.slice(6)).replace(/[&<>]/g, "")}</span>`;
  if (/^https?:\/\//.test(p)) return `<img src="${attrSafe(p)}" alt="" />`;
  const n = (user.displayName || user.email || "?").trim();
  return `<span class="av-initial">${attrSafe(n.charAt(0) || "?")}</span>`;
}

// Downscale/crop an image file to a small square thumbnail data URL (keeps storage tiny).
function fileToThumb(file, size, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Roles chosen at signup */
const ROLES = [
  ["🏡", "First-time buyer"],
  ["🔑", "Buying a home"],
  ["🏷️", "Selling a home"],
  ["🔄", "Buying & selling"],
  ["🗝️", "Renter exploring"],
  ["💼", "Real estate pro"],
  ["👀", "Just curious"],
];
const roleKey = (uid) => "getkeyd.role." + uid;

function chooseRole(user, done) {
  const overlay = document.createElement("div");
  overlay.className = "role-overlay";
  overlay.innerHTML = `
    <div class="role-modal">
      <h3>Welcome, ${escapeHtml(firstName(user))}! 👋</h3>
      <p>What brings you to getkeyd? We'll tailor things to you.</p>
      <div class="role-grid">
        ${ROLES.map((r, i) => `<button class="role-opt" data-i="${i}"><span class="role-ic">${r[0]}</span><span>${r[1]}</span></button>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll(".role-opt").forEach((btn) => btn.addEventListener("click", () => {
    try { localStorage.setItem(roleKey(user.uid), ROLES[+btn.dataset.i][1]); } catch (_) {}
    overlay.remove();
    if (done) done();
  }));
}

/* Celebrations: toast + confetti */
function toast(message) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 20);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3400);
}
function confetti() {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#7ba591", "#e0a284", "#e8c07d", "#5e8a75"];
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    r: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: -2 + Math.random() * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
  }));
  let frame = 0;
  let rafId;
  const tick = () => {
    if (!document.body.contains(canvas)) { cancelAnimationFrame(rafId); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); ctx.restore();
    });
    if (++frame < 160) rafId = requestAnimationFrame(tick);
    else canvas.remove();
  };
  tick();
}
function celebrate(message) {
  toast(message);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) confetti();
}

function renderDashboard(user) {
  const j = journeyStats(user.uid);
  const s = savingsStats(user.uid);

  let points = j.done * 10;
  if (s) points += 20;
  if (j.pct >= 100) points += 50;
  const level = Math.floor(points / 50) + 1;
  const intoLevel = points % 50;

  document.getElementById("dash-greeting").textContent = `Welcome back, ${firstName(user)}! 👋`;
  const avEl = document.getElementById("dash-avatar");
  if (avEl) avEl.innerHTML = avatarMarkup(user);
  document.getElementById("dash-level").textContent = `Level ${level}`;
  document.getElementById("dash-points").textContent = `${points} pts`;
  document.getElementById("dash-xpfill").style.width = (intoLevel / 50) * 100 + "%";
  document.getElementById("dash-xpnote").textContent = `${50 - intoLevel} pts to Level ${level + 1}`;

  document.getElementById("card-journey").innerHTML =
    `<h3>🗺️ Your Journey</h3>${ringSVG(j.pct, "var(--sage)")}
     <p class="sub">${j.done} of ${j.total} steps complete</p>
     <a class="btn primary" href="${base}pages/journey.html">Continue journey</a>`;

  document.getElementById("card-savings").innerHTML = s
    ? `<h3>🎯 Savings Goal</h3>${ringSVG(s.pct, "var(--clay)")}
       <p class="sub">${money(s.current)} of ${money(s.goal)} saved</p>
       <a class="btn ghost" href="${base}pages/plan.html">Update goal</a>`
    : `<h3>🎯 Savings Goal</h3><p class="sub" style="margin:28px 0">No down-payment goal set yet.</p>
       <a class="btn primary" href="${base}pages/plan.html">Set your goal</a>`;

  const badges = [
    ["🌱", "First Step", j.done >= 1],
    ["🧭", "Getting Going", j.done >= 5],
    ["🏡", "Halfway Home", j.pct >= 50],
    ["🔑", "Homeowner", j.pct >= 100],
    ["💰", "Goal Setter", !!s],
    ["📈", "On Track", !!s && s.pct >= 50],
  ];
  document.getElementById("dash-badges").innerHTML = badges
    .map(([ic, label, earned]) =>
      `<div class="badge-item ${earned ? "earned" : "locked"}"><span class="badge-ic">${ic}</span><span>${label}</span></div>`)
    .join("");

  // Daily streak
  const d = new Date();
  const today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const lastKey = progPrefix(user.uid) + "lastVisit";
  const streakKey = progPrefix(user.uid) + "streak";
  let streak = parseInt(localStorage.getItem(streakKey) || "0", 10);
  const last = localStorage.getItem(lastKey);
  if (last !== today) {
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const yday = yd.getFullYear() + "-" + String(yd.getMonth() + 1).padStart(2, "0") + "-" + String(yd.getDate()).padStart(2, "0");
    streak = last === yday ? streak + 1 : 1;
    localStorage.setItem(streakKey, String(streak));
    localStorage.setItem(lastKey, today);
  }
  const streakEl = document.getElementById("dash-streak");
  if (streakEl) { streakEl.textContent = `🔥 ${streak}-day streak`; streakEl.classList.remove("hidden"); }

  // Next best action
  const nextEl = document.getElementById("dash-next");
  if (nextEl) {
    let na;
    if (!s) na = ["🎯 Set your down-payment goal", "See how long until you're ready to buy.", base + "pages/plan.html"];
    else if (j.done === 0) na = ["🧭 Start your journey", "Check your credit score, that's step one.", base + "pages/journey.html"];
    else if (j.pct < 100) na = [`🗺️ Continue your journey (${j.pct}% done)`, "Pick up right where you left off.", base + "pages/journey.html"];
    else na = ["🎉 You've finished the journey!", "Explore trusted resources next.", base + "pages/resources.html"];
    nextEl.href = na[2];
    nextEl.innerHTML = `<span class="next-label">Your next step</span><strong>${na[0]}</strong><span class="next-sub">${na[1]}</span>`;
    nextEl.classList.remove("hidden");
  }

  // Celebrations on level-up / new badge (baseline set silently on first load)
  const earnedCount = badges.filter((b) => b[2]).length;
  const lvlKey = progPrefix(user.uid) + "seenLevel";
  const bdgKey = progPrefix(user.uid) + "seenBadges";
  const hadLvl = localStorage.getItem(lvlKey) !== null;
  const hadBdg = localStorage.getItem(bdgKey) !== null;
  if (hadLvl && level > parseInt(localStorage.getItem(lvlKey), 10)) celebrate(`Level up! You're Level ${level} 🎉`);
  else if (hadBdg && earnedCount > parseInt(localStorage.getItem(bdgKey), 10)) celebrate("New badge unlocked! 🏅");
  localStorage.setItem(lvlKey, String(level));
  localStorage.setItem(bdgKey, String(earnedCount));
}

/* ---------- Guided tour (new users) ---------- */
function startTour(user) {
  const steps = [
    { title: `Welcome, ${escapeHtml(firstName(user))}!`, body: "Here's a quick tour of your dashboard. It takes about 20 seconds." },
    { title: "Your level & points", body: "Earn points as you complete steps and hit goals, and level up as you go.", target: "#card-xp" },
    { title: "Journey progress", body: "Track every step from prep to closing. Each one you check off adds points.", target: "#card-journey" },
    { title: "Savings goal", body: "Set a down-payment goal and watch your progress and your projected ready-date.", target: "#card-savings" },
    { title: "Badges", body: "Unlock badges as you hit milestones on the way to owning your home.", target: "#dash-badges" },
    { title: "Explore anytime", body: "Use the menu (top left) to reach Plan, Journey, Learn, and Resources.", target: "#nav-toggle" },
  ];
  let i = 0;
  let spot = null;
  const panel = document.createElement("div");
  panel.className = "tour-panel";
  document.body.appendChild(panel);

  const clearSpot = () => { if (spot) { spot.classList.remove("tour-spot"); spot = null; } };
  const finish = () => {
    clearSpot();
    panel.remove();
    try { localStorage.setItem("getkeyd.tour." + user.uid, "done"); } catch (_) {}
  };
  const render = () => {
    const s = steps[i];
    clearSpot();
    if (s.target) {
      const t = document.querySelector(s.target);
      if (t) { t.classList.add("tour-spot"); spot = t; t.scrollIntoView({ behavior: "smooth", block: "center" }); }
    }
    panel.innerHTML = `
      <div class="tour-dots">${steps.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
      <h4>${s.title}</h4>
      <p>${s.body}</p>
      <div class="tour-actions">
        <button class="tour-skip" id="tour-skip">Skip</button>
        <div class="right">
          ${i > 0 ? '<button class="tour-btn" id="tour-back">Back</button>' : ""}
          <button class="tour-btn primary" id="tour-next">${i === steps.length - 1 ? "Done" : "Next"}</button>
        </div>
      </div>`;
    panel.querySelector("#tour-next").onclick = () => { if (i === steps.length - 1) finish(); else { i++; render(); } };
    const back = panel.querySelector("#tour-back");
    if (back) back.onclick = () => { i--; render(); };
    panel.querySelector("#tour-skip").onclick = finish;
  };
  render();
}

/* ---------- Combined home: guest view vs member dashboard ---------- */
const memberView = document.getElementById("member-view");
if (memberView) {
  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
      document.documentElement.classList.add("is-member");
      renderDashboard(user);
      const replay = document.getElementById("dash-tour-btn");
      if (replay) replay.onclick = () => startTour(user);
      // New users: pick a role first, then get the walkthrough.
      const needRole = !localStorage.getItem(roleKey(user.uid));
      const needTour = !localStorage.getItem("getkeyd.tour." + user.uid);
      if (needRole) {
        chooseRole(user, () => { if (needTour) setTimeout(() => startTour(user), 300); });
      } else if (needTour) {
        setTimeout(() => startTour(user), 500);
      }
    } else {
      document.documentElement.classList.remove("is-member");
    }
  });
}

/* ---------- Account settings (settings.html) ---------- */
const AVATAR_EMOJIS = ["🏡", "🔑", "🌱", "🌻", "🦉", "🐝", "⭐", "🚀", "🧭", "🍀", "🌞", "🐢"];

async function reauth(user) {
  if (!user.email) throw Object.assign(new Error("no-email"), { code: "auth/no-email" });
  const hasPw = user.providerData.some((p) => p.providerId === "password");
  if (hasPw) {
    const pw = prompt("Please re-enter your current password to continue:");
    if (!pw) throw new Error("cancelled");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw));
  } else {
    await reauthenticateWithPopup(user, googleProvider);
  }
}
async function withReauth(user, fn) {
  try { await fn(); }
  catch (e) {
    if (e.code === "auth/requires-recent-login") { await reauth(user); await fn(); }
    else throw e;
  }
}

if (document.getElementById("settings")) {
  onAuthStateChanged(auth, (user) => {
    if (!user || !user.emailVerified) {
      document.getElementById("settings-loading").classList.add("hidden");
      return;
    }
    document.getElementById("settings-loading").classList.add("hidden");
    document.getElementById("settings-content").classList.remove("hidden");

    const hasPw = user.providerData.some((p) => p.providerId === "password");
    const setMsg = (id, text, ok) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.classList.remove("hidden");
      el.classList.toggle("ok", !!ok);
      el.classList.toggle("err", !ok);
    };
    const clearSel = (grid, cls) => grid.querySelectorAll(cls).forEach((x) => x.classList.remove("sel"));

    // Profile picture — either an uploaded photo or an emoji.
    let chosenEmoji = user.photoURL || "";
    let chosenPhoto = null;
    try { chosenPhoto = localStorage.getItem(photoKey(user.uid)); } catch (_) {}
    const preview = document.getElementById("set-avatar-preview");
    const drawPreview = () => {
      preview.innerHTML = chosenPhoto
        ? `<img src="${chosenPhoto}" alt="" />`
        : avatarMarkup({ displayName: user.displayName, email: user.email, photoURL: chosenEmoji });
    };
    drawPreview();
    const grid = document.getElementById("set-avatar-grid");
    grid.innerHTML = AVATAR_EMOJIS.map((e) => `<button class="avatar-opt" data-e="${e}">${e}</button>`).join("");
    grid.querySelectorAll(".avatar-opt").forEach((b) => (b.onclick = () => {
      chosenEmoji = "emoji:" + b.dataset.e;
      chosenPhoto = null; // picking an emoji clears an uploaded photo
      clearSel(grid, ".avatar-opt");
      b.classList.add("sel");
      drawPreview();
    }));

    const fileInput = document.getElementById("set-avatar-file");
    const fileName = document.getElementById("set-avatar-filename");
    fileInput.onchange = async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { setMsg("set-avatar-msg", "Please choose an image file.", false); return; }
      if (file.size > 8 * 1024 * 1024) { setMsg("set-avatar-msg", "That image is over 8 MB. Please choose a smaller one.", false); return; }
      try {
        chosenPhoto = await fileToThumb(file, 256, 0.82);
        chosenEmoji = "";
        clearSel(grid, ".avatar-opt");
        if (fileName) fileName.textContent = file.name;
        drawPreview();
        setMsg("set-avatar-msg", "Looks good! Click “Save picture” to keep it.", true);
      } catch (_) {
        setMsg("set-avatar-msg", "We couldn't read that image. Please try a different file.", false);
      }
    };

    document.getElementById("set-avatar-save").onclick = async () => {
      try {
        if (chosenPhoto) {
          localStorage.setItem(photoKey(user.uid), chosenPhoto);
          await updateProfile(user, { photoURL: "" }); // uploaded photo takes precedence
        } else {
          try { localStorage.removeItem(photoKey(user.uid)); } catch (_) {}
          await updateProfile(user, { photoURL: chosenEmoji });
        }
        setMsg("set-avatar-msg", "Profile picture updated.", true);
      } catch (e) {
        if (e && e.name === "QuotaExceededError") setMsg("set-avatar-msg", "That image is too large to save. Please try a smaller photo.", false);
        else setMsg("set-avatar-msg", messageFor(e.code), false);
      }
    };

    // Username
    document.getElementById("set-username").value = user.displayName || "";
    document.getElementById("set-username-save").onclick = async () => {
      const name = document.getElementById("set-username").value.trim();
      if (!name) { setMsg("set-username-msg", "Please enter a name.", false); return; }
      try { await updateProfile(user, { displayName: name }); setMsg("set-username-msg", "Username updated.", true); }
      catch (e) { setMsg("set-username-msg", messageFor(e.code), false); }
    };

    // Role
    const roleGrid = document.getElementById("set-role-grid");
    if (roleGrid) {
      const current = localStorage.getItem(roleKey(user.uid));
      roleGrid.innerHTML = ROLES.map((r) => `<button class="role-opt ${current === r[1] ? "sel" : ""}" data-r="${r[1]}"><span class="role-ic">${r[0]}</span><span>${r[1]}</span></button>`).join("");
      roleGrid.querySelectorAll(".role-opt").forEach((b) => (b.onclick = () => {
        localStorage.setItem(roleKey(user.uid), b.dataset.r);
        clearSel(roleGrid, ".role-opt");
        b.classList.add("sel");
        setMsg("set-role-msg", "Saved.", true);
      }));
    }

    // Email
    document.getElementById("set-email-current").textContent = user.email;
    if (hasPw) {
      document.getElementById("set-email-save").onclick = async () => {
        const email = document.getElementById("set-email-new").value.trim();
        if (!email) { setMsg("set-email-msg", "Enter a new email.", false); return; }
        try {
          await withReauth(user, () => verifyBeforeUpdateEmail(user, email));
          setMsg("set-email-msg", "Verification sent to the new address. Click the link there to finish the change.", true);
        } catch (e) { if (e.message !== "cancelled") setMsg("set-email-msg", messageFor(e.code), false); }
      };
    } else {
      document.getElementById("set-email-fields").style.display = "none";
      document.getElementById("set-email-managed").style.display = "block";
    }

    // Password
    if (hasPw) {
      document.getElementById("set-password-save").onclick = async () => {
        const pw = document.getElementById("set-password-new").value;
        if (!pw || pw.length < 6) { setMsg("set-password-msg", "Password must be at least 6 characters.", false); return; }
        try {
          await withReauth(user, () => updatePassword(user, pw));
          document.getElementById("set-password-new").value = "";
          setMsg("set-password-msg", "Password updated.", true);
        } catch (e) { if (e.message !== "cancelled") setMsg("set-password-msg", messageFor(e.code), false); }
      };
    } else {
      document.getElementById("card-password").style.display = "none";
    }

    // Sign out
    document.getElementById("set-signout").onclick = logout;

    // Delete account (re-auth required, then wipe this user's local data)
    document.getElementById("set-delete").onclick = async () => {
      if (!confirm("Permanently delete your account and all your data? This cannot be undone.")) return;
      try {
        // Re-authenticate, then delete the Firebase account.
        await withReauth(user, () => deleteUser(user));
        // Remove all of this user's data from local storage (our current datastore).
        const pre = progPrefix(user.uid);
        const remove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(pre) || k === "getkeyd.tour." + user.uid || k === "getkeyd.role." + user.uid)) remove.push(k);
        }
        remove.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem("getkeyd.currentUid");
        alert("Your account and data have been deleted.");
        location.replace(base + "login.html");
      } catch (e) {
        if (e.message !== "cancelled") setMsg("set-delete-msg", messageFor(e.code), false);
      }
    };
  });
}

// Cache the signed-in uid so app.js can namespace progress per account,
// and refresh progress UI when the account changes.
onAuthStateChanged(auth, (user) => {
  // Signals to each page's watchdog that Firebase auth actually initialized.
  window.__gkAuthReady = true;
  const newUid = (user && user.emailVerified) ? user.uid : "";
  const prev = localStorage.getItem("getkeyd.currentUid") || "";
  if (newUid) localStorage.setItem("getkeyd.currentUid", newUid);
  else localStorage.removeItem("getkeyd.currentUid");
  if (newUid !== prev && typeof window.getkeydRefreshProgress === "function") {
    window.getkeydRefreshProgress();
  }
  renderAuthNav(user);
});

// Global gate: keep guests and unverified users out of every non-public page.
// Verified users get the page revealed; everyone else is sent to login.
onAuthStateChanged(auth, (user) => {
  if (isPublicPage) return;
  if (user && user.emailVerified) {
    document.documentElement.classList.remove("auth-gate");
  } else {
    try { sessionStorage.setItem("getkeyd.redirectAfterLogin", location.href); } catch (_) {}
    location.replace(base + "login.html");
  }
});
