/* getkeyd gamification engine
   Vanilla JS, no modules, CSP-safe. Progress lives in localStorage under
   "getkeyd.u.<uid>." (same namespace as auth.js/app.js). Exposes
   window.getkeydGamify (GK). Load before auth.js; every render is guarded,
   so load order never throws. */

(function () {
  var GK = {};

  /* ---------- Constants ---------- */
  GK.GK_XP = {
    step: 5, guide: 10, term: 2, goalSet: 15, goalHit: 25,
    streakDay: 10, firstSearch: 10, fiveSearches: 10, ready: 15,
  };
  GK.GK_LEVELS = [ // cumulative XP thresholds
    { xp: 0, name: "Scout", icon: "🔎" },
    { xp: 100, name: "Foundation", icon: "🧱" },
    { xp: 240, name: "Blueprint", icon: "📐" },
    { xp: 480, name: "Cornerstone", icon: "🗿" },
    { xp: 800, name: "Keys", icon: "🔑" },
    { xp: 1200, name: "Homeowner", icon: "🏡" },
  ];
  GK.GK_WEEKLY_GOAL = 50;

  function badge(id, icon, name, hint, check) {
    return { id: id, icon: icon, name: name, hint: hint, check: check };
  }
  GK.GK_BADGES = [
    badge("first-step", "🌱", "First Step", "Check off your first journey step", function (s) { return s.steps >= 1; }),
    badge("halfway", "🧭", "Halfway There", "Complete 12 of 23 journey steps", function (s) { return s.steps >= 12; }),
    badge("keys", "🏡", "Homeowner", "Finish all 23 journey steps", function (s) { return s.steps >= 23; }),
    badge("goal-setter", "💰", "Goal Setter", "Set your down-payment savings goal", function (s) { return !!s.savings; }),
    badge("on-track", "📈", "On Track", "Save 50% of your savings goal", function (s) { return !!s.savings && savingsPct(s) >= 50; }),
    badge("saver", "🎯", "Saver", "Save 100% of your savings goal", function (s) { return !!s.savings && savingsPct(s) >= 100; }),
    badge("bookworm", "📚", "Bookworm", "Read all 7 guides in Learn", function (s) { return s.guides >= 7; }),
    badge("scholar", "🎓", "Scholar", "Learn all 40 glossary terms", function (s) { return s.terms >= 40; }),
    badge("first-flame", "🔥", "First Flame", "Keep a 3-day streak", function (s) { return s.streak >= 3; }),
    badge("weekly-warrior", "⚔️", "Weekly Warrior", "Keep a 7-day streak", function (s) { return s.streak >= 7; }),
    badge("scout", "🕵️", "Scout", "Search an address", function (s) { return s.searches >= 1; }),
    badge("green-light", "🟢", "Green Light", "Score \"ready\" on the readiness assessment", function (s) { return s.assessment === "ready"; }),
  ];

  /* ---------- Safe storage (Safari private mode) ---------- */
  var store = null;
  function storage() {
    if (store !== null) return store;
    try { store = window.localStorage || null; } catch (_) { store = null; }
    return store;
  }
  function get(k) { try { var s = storage(); return s ? s.getItem(k) : null; } catch (_) { return null; } }
  function set(k, v) { try { var s = storage(); if (s) s.setItem(k, v); } catch (_) {} }

  function currentUid() { return get("getkeyd.currentUid") || "guest"; }
  function pref(uid) { return "getkeyd.u." + uid + "."; }

  /* ISO week "YYYY-Wnn" for a Date. */
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    var ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var wk = Math.ceil((((t - ys) / 86400000) + 1) / 7);
    return t.getUTCFullYear() + "-W" + String(wk).padStart(2, "0");
  }

  function savingsPct(s) {
    if (!s || !s.savings) return 0;
    var goal = s.savings.price * (s.savings.goalpct / 100);
    return goal > 0 ? Math.min(100, Math.round((s.savings.current / goal) * 100)) : 0;
  }

  /* ---------- State ---------- */
  GK.readState = function (uid) {
    uid = uid || currentUid();
    var pre = pref(uid);
    function count(prefix) {
      var n = 0;
      try {
        var s = storage();
        if (!s) return n;
        for (var i = 0; i < s.length; i++) {
          var k = s.key(i);
          if (k && k.indexOf(prefix) === 0 && s.getItem(k) === "1") n++;
        }
      } catch (_) {}
      return n;
    }
    var savings = null;
    try {
      var v = JSON.parse(get(pre + "savings") || "null");
      if (v && v.price != null && v.goalpct != null && v.current != null) {
        savings = { price: v.price, goalpct: v.goalpct, current: v.current };
      }
    } catch (_) {}
    return {
      steps: count(pre + "step."),
      guides: count(pre + "guide."),
      terms: count(pre + "learned."),
      savings: savings,
      streak: parseInt(get(pre + "streak") || "0", 10) || 0,
      searches: count(pre + "search."),
      assessment: get(pre + "assessment") === "ready" ? "ready" : "",
    };
  };

  /* ---------- XP / level (pure, never stored) ---------- */
  GK.compute = function (state) {
    var total = state.steps * 5 + state.guides * 10 + state.terms * 2;
    if (state.savings) total += GK.GK_XP.goalSet;
    if (state.savings && state.savings.current >= state.savings.price * (state.savings.goalpct / 100)) total += GK.GK_XP.goalHit;
    total += state.streak * 10;
    if (state.searches >= 1) total += GK.GK_XP.firstSearch;
    if (state.searches >= 5) total += GK.GK_XP.fiveSearches;
    if (state.assessment === "ready") total += GK.GK_XP.ready;

    var li = 0;
    for (var i = 1; i < GK.GK_LEVELS.length; i++) {
      if (GK.GK_LEVELS[i].xp <= total) li = i;
    }
    var lvl = GK.GK_LEVELS[li];
    var next = GK.GK_LEVELS[li + 1] || null;
    return {
      total: total,
      levelIndex: li,
      level: lvl,
      into: total - lvl.xp,
      need: next ? next.xp - total : 0,
    };
  };

  /* ---------- Badges ---------- */
  GK.badges = function (state) {
    return GK.GK_BADGES.map(function (b) { return { badge: b, earned: b.check(state) }; });
  };
  GK.nextBadge = function (state) {
    var list = GK.badges(state);
    for (var i = 0; i < list.length; i++) {
      if (!list[i].earned) return { badge: list[i].badge, delta: list[i].badge.hint };
    }
    return null;
  };

  /* ---------- Weekly XP ---------- */
  GK.weekly = function (state, uid) {
    uid = uid || currentUid();
    var xp = parseInt(get(pref(uid) + "weekly." + isoWeek(new Date())) || "0", 10) || 0;
    xp = Math.min(GK.GK_WEEKLY_GOAL, xp);
    return { xp: xp, goal: GK.GK_WEEKLY_GOAL, pct: Math.round((xp / GK.GK_WEEKLY_GOAL) * 100) };
  };

  /* ---------- Toast (auth.js's celebrate is module-scoped, so inline) ---------- */
  var toastEl = null;
  function toast(msg) {
    if (typeof window.getkeydCelebrate === "function") { window.getkeydCelebrate(msg); return; }
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);" +
        "background:var(--sage-deep,#5e8a75);color:#fff;padding:12px 22px;border-radius:999px;" +
        "font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9500;opacity:0;transition:opacity .35s";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.style.opacity = "1"; });
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () {
      toastEl.style.opacity = "0";
      setTimeout(function () { if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl); toastEl = null; }, 400);
    }, 3000);
  }

  /* ---------- Seen snapshot (baseline for celebrations, set silently on first sight) ---------- */
  function loadSeen(uid) {
    try { return JSON.parse(get(pref(uid) + "seen") || "null"); } catch (_) { return null; }
  }
  function saveSeen(uid, lvl, earnedIds) {
    set(pref(uid) + "seen", JSON.stringify({ lvl: lvl, b: earnedIds }));
  }

  /* ---------- Award ---------- */
  GK.award = function (reason, uid) {
    uid = uid || currentUid();
    var xp = GK.GK_XP[reason];
    if (!xp) return; // unknown reasons are ignored silently

    var wkey = pref(uid) + "weekly." + isoWeek(new Date());
    var beforeWeek = parseInt(get(wkey) || "0", 10) || 0;
    set(wkey, String(beforeWeek + xp));
    var afterWeek = parseInt(get(wkey) || "0", 10) || 0;

    var state = GK.readState(uid);
    var c = GK.compute(state);
    var list = GK.badges(state);
    var seen = loadSeen(uid);
    if (seen) {
      if (c.levelIndex > seen.lvl) toast("Level up! You reached " + c.level.name + " " + c.level.icon);
      for (var i = 0; i < list.length; i++) {
        if (list[i].earned && seen.b.indexOf(list[i].badge.id) === -1) {
          toast("Badge unlocked: " + list[i].badge.name + " " + list[i].badge.icon);
        }
      }
      if (Math.min(GK.GK_WEEKLY_GOAL, beforeWeek) < GK.GK_WEEKLY_GOAL && Math.min(GK.GK_WEEKLY_GOAL, afterWeek) >= GK.GK_WEEKLY_GOAL) {
        toast("Weekly goal reached! 🎉");
      }
    }
    saveSeen(uid, c.levelIndex, list.filter(function (b) { return b.earned; }).map(function (b) { return b.badge.id; }));
    GK.render(uid);
  };

  /* ---------- Dashboard render (every element guarded) ---------- */
  GK.render = function (uid) {
    uid = uid || currentUid();
    var state = GK.readState(uid);
    var c = GK.compute(state);

    var lvl = document.getElementById("dash-level");
    if (lvl) lvl.textContent = c.level.icon + " Level " + (c.levelIndex + 1) + " · " + c.level.name;
    var pts = document.getElementById("dash-points");
    if (pts) pts.textContent = c.total + " XP";
    var fill = document.getElementById("dash-xpfill");
    if (fill) fill.style.width = (c.need > 0 ? Math.min(100, (c.into / c.need) * 100) : 100) + "%";
    var note = document.getElementById("dash-xpnote");
    if (note) {
      var next = GK.GK_LEVELS[c.levelIndex + 1];
      note.textContent = next
        ? c.need + " XP to Level " + (c.levelIndex + 2) + " · " + next.name
        : "Max level — " + c.level.name + " " + c.level.icon;
    }

    var streak = document.getElementById("dash-streak");
    if (streak) {
      if (state.streak > 0) { streak.textContent = "🔥 " + state.streak + "-day streak"; streak.classList.remove("hidden"); }
      else streak.classList.add("hidden");
    }

    var badgesEl = document.getElementById("dash-badges");
    if (badgesEl) {
      badgesEl.innerHTML = GK.badges(state).map(function (b) {
        return '<div class="badge-item ' + (b.earned ? "earned" : "locked") + '"' +
          (b.earned ? "" : ' title="' + b.badge.hint + '"') + '>' +
          '<span class="badge-ic">' + b.badge.icon + '</span><span>' + b.badge.name + '</span></div>';
      }).join("");
    }

    renderWeekly(state, uid);
    saveSeen(uid, c.levelIndex, GK.badges(state).filter(function (b) { return b.earned; }).map(function (b) { return b.badge.id; }));
  };

  /* Weekly ring, created lazily before #dash-next (pattern from auth.js ringSVG). */
  function renderWeekly(state, uid) {
    var host = document.getElementById("dash-weekly");
    if (!host) {
      var card = document.getElementById("card-xp");
      var next = document.getElementById("dash-next");
      if (!card) return;
      host = document.createElement("div");
      host.id = "dash-weekly";
      host.className = "dash-card";
      host.style.textAlign = "left";
      if (next && next.parentNode === card.parentNode) card.parentNode.insertBefore(host, next);
      else card.parentNode.appendChild(host);
    }
    var w = GK.weekly(state, uid);
    var C = 2 * Math.PI * 52;
    var off = C * (1 - w.pct / 100);
    host.innerHTML =
      "<h3>📅 Weekly Goal</h3>" +
      '<svg class="ring" width="80" height="80" viewBox="0 0 120 120">' +
      '<circle class="ring-track" cx="60" cy="60" r="52"></circle>' +
      '<circle class="ring-fill" cx="60" cy="60" r="52" style="stroke:var(--sage);--off:' + off.toFixed(1) + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"></circle>' +
      '<text class="ring-pct" x="60" y="68" text-anchor="middle">' + w.pct + "%</text></svg>" +
      '<p class="sub" style="margin:0">' + w.xp + " of " + w.goal + " XP earned this week</p>";
  }

  window.getkeydGamify = GK;
})();
