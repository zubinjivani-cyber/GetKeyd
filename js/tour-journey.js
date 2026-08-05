/* getkeyd - Guided audio walkthrough for the Journey page.
   Plays one narration track (journey-narration.m4a) and drives the on-screen
   walkthrough in sync with it: as the audio reaches each cue time, the tour
   spotlights the matching part of the page and performs the action being
   described (open a phase, check a step, reach 100%).

   Self-contained: no dependencies, no external services.

   TUNING: if the narration and visuals drift, adjust the `at` seconds in CUES
   below to match your audio. They were set from the 74s narration script. */

(function () {
  const list = document.getElementById("journey-list");
  if (!list) return;

  const AUDIO_SRC = "../assets/journey-narration.m4a";

  /* ---------- helpers to drive the page (demo changes are never persisted) ---------- */
  const phases = () => Array.from(document.querySelectorAll("#journey-list .phase"));
  const boxes = () => Array.from(document.querySelectorAll('#journey-list input[type="checkbox"]'));
  const openPhase = (i) => { const p = phases()[i]; if (p) p.classList.add("open"); };

  // Set a checkbox and fire the real change handler so the app updates naturally.
  function setBox(input, checked) {
    if (!input || input.checked === checked) return;
    input.checked = checked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const firstStep = () => { const b = boxes()[0]; return b ? b.closest(".step") : null; };

  // A cheerful check-off: green glow, bouncy pop, and a little burst of sparkles.
  function happyCheck(stepEl) {
    if (!stepEl) return;
    stepEl.classList.remove("gt-happy"); void stepEl.offsetWidth; stepEl.classList.add("gt-happy");
    const input = stepEl.querySelector("input");
    if (input) { input.classList.remove("gt-pop"); void input.offsetWidth; input.classList.add("gt-pop"); }
    const r = (input || stepEl).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const emojis = ["✨", "🎉", "⭐", "💚", "✅", "✨"];
    const N = 6;
    for (let n = 0; n < N; n++) {
      const s = document.createElement("div");
      s.className = "gt-spark";
      s.textContent = emojis[n % emojis.length];
      const ang = (Math.PI * 2 * n) / N - Math.PI / 2, dist = 32 + (n % 3) * 14;
      s.style.left = cx + "px"; s.style.top = cy + "px";
      s.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
      s.style.setProperty("--dy", Math.round(Math.sin(ang) * dist - 14) + "px");
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 850);
    }
  }

  let snapshot = null;
  function takeSnapshot() { snapshot = boxes().map((b) => b.checked); }
  function applySnapshot() {
    if (!snapshot) return;
    boxes().forEach((b, i) => setBox(b, !!snapshot[i]));
  }

  /* ---------- cue points: time (s) -> what to show + say on screen ---------- */
  const CUES = [
    { at: 0,  sel: ".section h2", title: "Your Guided Journey",
      say: "Buying your first home has a lot of moving parts — the Guided Journey breaks it into simple, checkable steps." },
    { at: 9,  sel: ".progress-wrap", title: "See your progress",
      say: "This progress bar tracks how far along you are, and fills up as you go." },
    { at: 20, sel: "#journey-list .phase:nth-child(1)", title: "Six simple phases",
      before: () => openPhase(0),
      say: "Your journey is grouped into six phases, starting with Financial Prep." },
    { at: 31, sel: "#journey-list .phase:nth-child(1) .step:nth-child(1)", title: "Check off a step",
      actAt: 34.3, // fires on "…just check it off. Watch —"
      setState: () => setBox(boxes()[0], true),
      flair: () => happyCheck(firstStep()),
      say: "As you complete each step, just check it off — watch it mark done and your progress climb." },
    { at: 43, sel: "#journey-list .phase:nth-child(2) .phase-head", title: "Open any phase",
      before: () => openPhase(1),
      say: "Each phase clicks open to reveal its steps — getting pre-approved, comparing lenders, and more." },
    { at: 54, sel: "#journey-list .phase:last-child", title: "All the way to closing",
      before: () => openPhase(phases().length - 1),
      say: "It carries all the way through the offer, inspection and appraisal, and closing day." },
    { at: 60, sel: ".progress-wrap", title: "Reach one hundred percent",
      before: () => boxes().forEach((b) => setBox(b, true)),
      say: "Check off everything and you'll hit one hundred percent — with a little celebration." },
    { at: 66, sel: "#journey-list .phase:nth-child(1) .step:nth-child(1)", title: "You're all set",
      after: () => happyCheck(firstStep()),
      say: "Your progress saves to your account, so you can pick up right where you left off." },
  ];

  /* ---------- styles ---------- */
  const style = document.createElement("style");
  style.textContent = `
  .gt-launch{position:fixed;right:18px;bottom:18px;z-index:9990;display:inline-flex;align-items:center;gap:8px;
    padding:12px 18px;border:none;border-radius:999px;cursor:pointer;font:600 15px/1 Inter,system-ui,sans-serif;
    color:#fff;background:var(--sage,#7ba591);box-shadow:0 8px 24px rgba(0,0,0,.18);transition:transform .15s ease}
  .gt-launch:hover{transform:translateY(-2px)}
  .gt-overlay{position:fixed;inset:0;z-index:9995;pointer-events:none;opacity:0;transition:opacity .3s ease}
  .gt-overlay.on{opacity:1}
  .gt-hole{position:absolute;border-radius:14px;box-shadow:0 0 0 9999px rgba(24,26,25,.55);
    border:2px solid var(--sage,#7ba591);
    transition:left .7s cubic-bezier(.22,.61,.36,1),top .7s cubic-bezier(.22,.61,.36,1),width .7s cubic-bezier(.22,.61,.36,1),height .7s cubic-bezier(.22,.61,.36,1),opacity .4s ease}
  .gt-overlay.nohole .gt-hole{opacity:0}
  .gt-overlay.nohole::before{content:"";position:absolute;inset:0;background:rgba(24,26,25,.58)}
  .gt-panel{position:fixed;left:50%;bottom:26px;transform:translate(-50%,12px);z-index:9996;width:min(540px,92vw);
    background:var(--cream,#faf6f0);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.28);padding:18px 22px 20px;
    pointer-events:auto;font-family:Inter,system-ui,sans-serif;opacity:0;
    transition:opacity .4s ease,transform .4s cubic-bezier(.22,.61,.36,1)}
  .gt-panel.on{opacity:1;transform:translate(-50%,0)}
  .gt-dots{display:flex;gap:6px;margin-bottom:11px}
  .gt-dots i{width:7px;height:7px;border-radius:50%;background:rgba(0,0,0,.15);transition:background .3s}
  .gt-dots i.on{background:var(--sage,#7ba591)}
  .gt-title{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:20px;color:var(--ink,#2c332e);margin:0 0 6px}
  .gt-say{font-size:15px;line-height:1.5;color:#4a534d;margin:0 0 14px;min-height:44px}
  .gt-seek{width:100%;height:5px;border-radius:3px;background:rgba(0,0,0,.1);overflow:hidden;margin:0 0 14px}
  .gt-seek > i{display:block;height:100%;width:0;background:var(--sage,#7ba591);transition:width .2s linear}
  .gt-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .gt-actions .right{display:flex;gap:8px}
  .gt-btn{border:none;border-radius:999px;padding:9px 16px;font:600 14px/1 Inter,system-ui,sans-serif;cursor:pointer}
  .gt-btn.primary{background:var(--sage,#7ba591);color:#fff}
  .gt-btn.ghost{background:transparent;color:#6b746e}
  .gt-btn.ghost:hover{background:rgba(0,0,0,.05)}
  .gt-btn.back{background:transparent;color:var(--sage,#7ba591);border:1.5px solid var(--sage,#7ba591)}
  .gt-btn.back:hover{background:var(--sage-soft,rgba(123,165,145,.14))}
  .step.gt-happy{border-radius:8px;animation:gtHappy .65s ease}
  @keyframes gtHappy{0%{background:transparent}25%{background:var(--sage-soft,rgba(123,165,145,.28))}100%{background:transparent}}
  .step input.gt-pop{animation:gtPop .5s cubic-bezier(.34,1.56,.64,1)}
  @keyframes gtPop{0%{transform:scale(1)}45%{transform:scale(1.45)}70%{transform:scale(.9)}100%{transform:scale(1)}}
  .gt-spark{position:fixed;z-index:9997;pointer-events:none;font-size:15px;will-change:transform,opacity;animation:gtSpark .8s ease-out forwards}
  @keyframes gtSpark{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.1)}}
  @media (prefers-reduced-motion:reduce){.gt-hole,.gt-overlay,.gt-panel{transition:none}.step.gt-happy,.step input.gt-pop,.gt-spark{animation:none}}
  `;
  document.head.appendChild(style);

  /* ---------- launch button ---------- */
  const launch = document.createElement("button");
  launch.className = "gt-launch";
  launch.innerHTML = "🎧 Take the guided tour";
  document.body.appendChild(launch);

  /* ---------- overlay + panel ---------- */
  const overlay = document.createElement("div");
  overlay.className = "gt-overlay";
  overlay.innerHTML = `<div class="gt-hole"></div>`;
  const hole = overlay.firstElementChild;
  const panel = document.createElement("div");
  panel.className = "gt-panel";

  /* ---------- audio ---------- */
  const audio = new Audio(AUDIO_SRC);
  audio.preload = "auto";

  let active = false;
  let currentIndex = -1;
  const firedActs = new Set(); // cues whose timed action has already run

  /* ---------- spotlight ---------- */
  function spotlight(sel) {
    if (!sel) { overlay.classList.add("nohole"); return; }
    overlay.classList.remove("nohole");
    const el = document.querySelector(sel);
    if (!el) { overlay.classList.add("nohole"); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      hole.style.left = (r.left - pad) + "px";
      hole.style.top = (r.top - pad) + "px";
      hole.style.width = (r.width + pad * 2) + "px";
      hole.style.height = (r.height + pad * 2) + "px";
    }, 380);
  }

  /* ---------- panel render ---------- */
  function renderPanel() {
    const c = CUES[currentIndex] || CUES[0];
    panel.innerHTML = `
      <div class="gt-dots">${CUES.map((_, i) => `<i class="${i === currentIndex ? "on" : ""}"></i>`).join("")}</div>
      <h3 class="gt-title">${c.title}</h3>
      <p class="gt-say">${c.say}</p>
      <div class="gt-seek"><i id="gt-seekfill"></i></div>
      <div class="gt-actions">
        <button class="gt-btn ghost" id="gt-exit">Exit tour</button>
        <div class="right">
          <button class="gt-btn back" id="gt-back" aria-label="Back" ${currentIndex <= 0 ? 'style="visibility:hidden"' : ""}>‹ Back</button>
          <button class="gt-btn ghost" id="gt-playpause">${audio.paused ? "Play" : "Pause"}</button>
          <button class="gt-btn primary" id="gt-next">${currentIndex >= CUES.length - 1 ? "Finish" : "Next ›"}</button>
        </div>
      </div>`;
    panel.querySelector("#gt-exit").onclick = endTour;
    panel.querySelector("#gt-playpause").onclick = () => { audio.paused ? audio.play() : audio.pause(); syncPlayPause(); };
    const seekTo = (i) => { audio.currentTime = CUES[i].at + 0.05; if (audio.paused) onTime(); else audio.play(); };
    panel.querySelector("#gt-next").onclick = () => {
      const ni = currentIndex + 1;
      if (ni >= CUES.length) { endTour(); return; }
      seekTo(ni);
    };
    const back = panel.querySelector("#gt-back");
    if (back) back.onclick = () => { if (currentIndex > 0) seekTo(currentIndex - 1); };
  }
  function syncPlayPause() {
    const b = panel.querySelector("#gt-playpause");
    if (b) b.textContent = audio.paused ? "Play" : "Pause";
  }

  /* ---------- move to a cue ---------- */
  function applyCue(i) {
    if (i === currentIndex) return;
    const goingBack = i < currentIndex;
    currentIndex = i;
    if (goingBack) {
      // Rebuild demo state deterministically so the page matches this earlier cue.
      applySnapshot();
      for (let k = 0; k <= i; k++) { const b = CUES[k].before; if (b) { try { b(); } catch (_) {} } }
      // Re-apply (without the flashy animation) any timed check-offs already due by this time.
      firedActs.clear();
      const nowT = CUES[i].at;
      for (let k = 0; k < CUES.length; k++) {
        const c = CUES[k];
        if (c.actAt != null && nowT >= c.actAt) { if (c.setState) { try { c.setState(); } catch (_) {} } firedActs.add(k); }
      }
    } else {
      const b = CUES[i].before; if (b) { try { b(); } catch (_) {} }
    }
    renderPanel();
    spotlight(CUES[i].sel);
    // Run the cue's decorative hook (e.g. the happy check-off) after the scroll settles.
    const c = CUES[i];
    if (c.after) {
      const my = i;
      setTimeout(() => { if (active && currentIndex === my) { try { c.after(); } catch (_) {} } }, 520);
    }
  }

  /* ---------- audio-driven sync ---------- */
  function onTime() {
    if (!active) return;
    const t = audio.currentTime;
    // Find the latest cue whose time we've passed.
    let idx = 0;
    for (let i = 0; i < CUES.length; i++) if (t >= CUES[i].at) idx = i;
    if (idx !== currentIndex) applyCue(idx);
    // Timed actions: fire exactly when the narration reaches the moment (e.g. "Watch —").
    for (let i = 0; i < CUES.length; i++) {
      const c = CUES[i];
      if (c.actAt != null && t >= c.actAt && !firedActs.has(i)) {
        firedActs.add(i);
        if (c.setState) { try { c.setState(); } catch (_) {} }
        if (c.flair) { try { c.flair(); } catch (_) {} }
      }
    }
    const fill = panel.querySelector("#gt-seekfill");
    if (fill && audio.duration) fill.style.width = (t / audio.duration * 100) + "%";
  }
  audio.addEventListener("timeupdate", onTime);
  audio.addEventListener("play", syncPlayPause);
  audio.addEventListener("pause", syncPlayPause);
  audio.addEventListener("ended", () => { if (active) endTour(); });
  audio.addEventListener("error", () => {
    if (!active) return;
    const say = panel.querySelector(".gt-say");
    if (say) say.textContent = "Couldn't load the narration audio (journey-narration.m4a). The visual walkthrough will still play — use Next to step through.";
  });

  /* ---------- start / end ---------- */
  function startTour() {
    active = true;
    currentIndex = -1;
    firedActs.clear();
    takeSnapshot();
    launch.style.display = "none";
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    requestAnimationFrame(() => { overlay.classList.add("on"); panel.classList.add("on"); });
    applyCue(0);
    audio.currentTime = 0;
    audio.play().catch(() => {/* autoplay blocked shouldn't happen: launched by click */});
  }

  function endTour() {
    if (!active) return;
    active = false;
    audio.pause();
    audio.currentTime = 0;
    applySnapshot();
    snapshot = null;
    overlay.classList.remove("on"); panel.classList.remove("on");
    setTimeout(() => { overlay.remove(); panel.remove(); launch.style.display = ""; }, 300);
  }

  window.addEventListener("beforeunload", () => { if (active) endTour(); });

  launch.addEventListener("click", startTour);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && active) endTour(); });

  // Give real check-offs (outside the tour) the same happy animation.
  list.addEventListener("change", (e) => {
    if (active) return; // during the tour, cues drive their own animations
    const t = e.target;
    if (t && t.matches('input[type="checkbox"]') && t.checked) happyCheck(t.closest(".step"));
  });
})();
