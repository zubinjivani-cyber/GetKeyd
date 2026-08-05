// getkeyd - vanilla JS, no dependencies, no build step.
// One shared script across pages: each block runs only if its
// elements exist on the current page.

/* ---------- Entrance intro (home page only) ---------- */
const intro = document.getElementById('intro');
if (intro) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('intro-lock');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    intro.classList.add('hide');
    document.body.classList.remove('intro-lock');
    setTimeout(() => intro.remove(), 1000);
  };
  const timer = setTimeout(finish, reduce ? 200 : 2700);
  intro.addEventListener('click', () => { clearTimeout(timer); finish(); }, { once: true });
  window.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { clearTimeout(timer); finish(); } }, { once: true });
}

// Monthly principal & interest for a loan amount, annual rate %, and term in years.
function monthlyPI(loan, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return loan / n;
  return loan * r / (1 - Math.pow(1 + r, -n));
}

/* ---------- Readiness Assessment ---------- */
const assessmentForm = document.getElementById('assessment-form');
if (assessmentForm) {
  assessmentForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const income = +f.income.value;
    const debts = +f.debts.value;
    const savings = +f.savings.value;
    const credit = f.credit.value;
    const rate = +f.rate.value / 100 / 12;
    const targetPrice = +f.region.value;

    const monthlyIncome = income / 12;

    // Standard 36% back-end DTI cap for total debt including housing.
    const maxTotalDebt = monthlyIncome * 0.36;
    const maxHousing = Math.max(0, maxTotalDebt - debts);

    // Reserve ~28% of the housing payment for taxes, insurance, PMI, etc.
    const maxPrincipalInterest = maxHousing * 0.72;

    // Assume 10% down; solve loan amount from monthly payment (30-yr).
    const n = 360;
    const affordableLoan = rate > 0
      ? maxPrincipalInterest * (1 - Math.pow(1 + rate, -n)) / rate
      : maxPrincipalInterest * n;
    const affordablePrice = affordableLoan / 0.9; // 10% down

    const estMonthly = maxHousing;

    // Down payment gap: need ~10% down + ~3% closing = 13% of target price.
    const cashNeeded = targetPrice * 0.13;
    const cashGap = cashNeeded - savings;

    let cls, headline;
    const canAffordTarget = affordablePrice >= targetPrice * 0.95 && cashGap <= 0 &&
      (credit === 'excellent' || credit === 'good');

    if (canAffordTarget) {
      cls = 'ready'; headline = "You look ready to start the pre-approval process.";
    } else if (affordablePrice >= targetPrice * 0.6 && cashGap <= cashNeeded * 0.5) {
      cls = 'soon'; headline = "You're close - a few improvements will get you there.";
    } else {
      cls = 'work'; headline = "Let's build your foundation first. Here's the plan.";
    }

    let months = 0;
    if (cashGap > 0) months += Math.ceil(cashGap / Math.max(monthlyIncome * 0.15, 1));
    if (credit === 'fair') months = Math.max(months, 6);
    if (credit === 'poor' || credit === 'unknown') months = Math.max(months, 12);
    const timeline = months <= 0 ? 'Now' : (months >= 12 ? '12+ months' : `~${months} months`);

    const tips = [];
    if (cashGap > 0) tips.push(`Save about ${money(cashGap)} more toward your down payment and closing costs (target ~13% of price).`);
    if (debts > monthlyIncome * 0.15) tips.push('Your monthly debt is high relative to income - paying down debt raises how much home you can afford.');
    if (credit === 'fair') tips.push('Move your credit into the "good" range (680+) to unlock better rates.');
    if (credit === 'poor') tips.push('Focus on credit-building: on-time payments and lowering credit-card balances have the biggest impact.');
    if (credit === 'unknown') tips.push('Check your credit score (free from most banks) so you know where you stand.');
    if (affordablePrice < targetPrice) tips.push(`Your current affordable range is around ${money(affordablePrice)}. Consider adjusting your target or growing your income.`);
    if (tips.length === 0) tips.push('Head to the Guided Journey to prepare your pre-approval documents.');

    const el = document.getElementById('assessment-result');
    if (el) {
      el.classList.remove('hidden');
      el.innerHTML = `
      <div class="verdict ${cls}">${headline}</div>
      <div class="stat-row">
        <div class="stat"><div class="num">${money(affordablePrice)}</div><div class="lbl">Affordable price range</div></div>
        <div class="stat"><div class="num">${money(estMonthly)}</div><div class="lbl">Est. monthly housing budget</div></div>
        <div class="stat"><div class="num">${timeline}</div><div class="lbl">Est. time to readiness</div></div>
      </div>
      <h3>What to work on next</h3>
      <ul class="tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="sub" style="margin-top:16px">Estimates use a 36% debt-to-income guideline, 10% down, and a 30-year term. For education only - a lender will give you exact numbers.</p>
      <a href="journey.html" class="btn primary">Continue to your journey →</a>
    `;
    }
  });
}

/* ---------- Guided Journey ---------- */
// JOURNEY is defined in data.js (loaded before this file)

function stepKey(p, s) { return uidPrefix() + `step.${p}.${s}`; }

// Pull the 11-char video id out of any common YouTube URL shape.
function ytId(url) {
  const m = String(url).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

// Optional 3rd item on a journey step: an array of learning resources, shown
// behind a "Learn more" toggle. Videos embed & play inline on click.
// Each: { type:'video'|'article'|'law'|'course'|'tool', title, url, minutes?, source? }
function stepResources(res) {
  if (!Array.isArray(res) || !res.length) return '';
  const icons = { video: '▶', article: '📄', law: '⚖️', course: '🎓', tool: '🛠️' };
  const verbs = { video: 'Watch', article: 'Read', law: 'View', course: 'Start', tool: 'Open' };
  const items = res.map(r => {
    const type = r.type || 'article';
    const meta = r.minutes ? `${r.minutes} min` : (r.source || '');
    const metaHtml = `<span class="res-m">${verbs[type] || 'Read'}${meta ? ' · ' + meta : ''}</span>`;
    const inner = `<span class="res-ic">${icons[type] || '📄'}</span><span class="res-t">${r.title}</span>${metaHtml}`;
    // Video: embed & play inline (stays on the site).
    const vid = ytId(r.url);
    if (type === 'video' && vid) {
      return `<div class="res-item res-video" data-yt="${vid}">
          <button type="button" class="res-link res-play">${inner}</button>
          <div class="res-embed"></div></div>`;
    }
    // Our own explainer text: expands in-page and cites the source (stays on the site).
    if (r.body) {
      const src = r.url ? `<p class="res-src"><a href="${r.url}" target="_blank" rel="noopener">Full details at ${r.source || 'the source'} ↗</a></p>` : '';
      return `<div class="res-item res-read">
          <button type="button" class="res-link res-open">${inner}</button>
          <div class="res-body"><div class="res-body-inner">${r.body}${src}</div></div></div>`;
    }
    // Fallback: external link (opens in a new tab so your tab stays open).
    return `<a class="res-link res-${type}" href="${r.url}" target="_blank" rel="noopener">${inner}</a>`;
  }).join('');
  return `<div class="step-res">
      <button type="button" class="res-toggle" aria-expanded="false">📚 Learn more <span class="res-caret">▸</span></button>
      <div class="res-panel">${items}</div>
    </div>`;
}

function renderJourney() {
  const list = document.getElementById('journey-list');
  list.innerHTML = '';
  JOURNEY.forEach((ph, pi) => {
    const phaseEl = document.createElement('div');
    phaseEl.className = 'phase' + (pi === 0 ? ' open' : '');
    let doneCount = ph.steps.filter((_, si) => localStorage.getItem(stepKey(pi, si)) === '1').length;
    phaseEl.innerHTML = `
      <div class="phase-head">
        <h3>${ph.phase}</h3>
        <span><span class="badge">${doneCount}/${ph.steps.length}</span> <span class="caret">▸</span></span>
      </div>
      <div class="phase-body"></div>`;
    const body = phaseEl.querySelector('.phase-body');
    ph.steps.forEach((st, si) => {
      const checked = localStorage.getItem(stepKey(pi, si)) === '1';
      const step = document.createElement('div');
      step.className = 'step' + (checked ? ' done' : '');
      const id = `s-${pi}-${si}`;
      step.innerHTML = `
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} />
        <div class="step-main">
          <label for="${id}">${st[0]}<span class="desc">${st[1]}</span></label>
          ${stepResources(st[2])}
        </div>`;
      step.querySelector('input').addEventListener('change', e => {
        localStorage.setItem(stepKey(pi, si), e.target.checked ? '1' : '0');
        // Update in place so the open/closed state of each phase is preserved.
        step.classList.toggle('done', e.target.checked);
        doneCount += e.target.checked ? 1 : -1;
        phaseEl.querySelector('.badge').textContent = `${doneCount}/${ph.steps.length}`;
        updateProgress();
      });
      body.appendChild(step);
    });
    phaseEl.querySelector('.phase-head').addEventListener('click', () => phaseEl.classList.toggle('open'));
    list.appendChild(phaseEl);
  });
  updateProgress();
}

function updateProgress() {
  let total = 0, done = 0;
  JOURNEY.forEach((ph, pi) => ph.steps.forEach((_, si) => {
    total++;
    if (localStorage.getItem(stepKey(pi, si)) === '1') done++;
  }));
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pf = document.getElementById('progress-fill');
  const pl = document.getElementById('progress-label');
  const jc = document.getElementById('journey-celebrate');
  if (pf) pf.style.width = pct + '%';
  if (pl) pl.textContent = `${pct}% complete`;
  if (jc) jc.classList.toggle('hidden', pct < 100);
}

const journeyList = document.getElementById('journey-list');
if (journeyList) {
  renderJourney();
  const resetBtn = document.getElementById('reset-progress');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all your journey progress? This can\'t be undone.')) return;
    JOURNEY.forEach((ph, pi) => ph.steps.forEach((_, si) => localStorage.removeItem(stepKey(pi, si))));
    renderJourney();
  });

  // "Learn more" expand/collapse + lazy-load YouTube embeds (one delegated handler).
  journeyList.addEventListener('click', e => {
    const toggle = e.target.closest('.res-toggle');
    if (toggle) {
      const open = toggle.closest('.step-res').classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    const openBtn = e.target.closest('.res-open');
    if (openBtn) { openBtn.closest('.res-item').classList.toggle('open'); return; }
    const play = e.target.closest('.res-play');
    if (play) {
      const item = play.closest('.res-video');
      const embed = item.querySelector('.res-embed');
      if (embed && !embed.firstChild) {
        embed.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + item.dataset.yt +
          '?autoplay=1&rel=0" title="Video tutorial" loading="lazy" ' +
          'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        item.classList.add('playing');
      }
    }
  });
}

/* ---------- Learn: in-depth guides ---------- */
// GUIDES is defined in data.js (loaded before this file)
const guideReadKey = slug => uidPrefix() + 'guide.' + slug;
const isGuideRead = slug => localStorage.getItem(guideReadKey(slug)) === '1';

function renderPctBar(el, done, total, noun) {
  const pct = total ? Math.round(done / total * 100) : 0;
  // ponytail: verb/plural keyed off the emoji keeps the shared signature at 4 params.
  el.innerHTML = `<div class="bar"><i style="width:${pct}%"></i></div>
    <span>${noun} You've ${noun === '📚' ? 'read' : 'learned'} <strong>${done}</strong> of ${total} ${noun === '📚' ? 'guides' : 'terms'}</span>`;
}

function updateGuideProgress() {
  const el = document.getElementById('guides-progress');
  if (!el) return;
  renderPctBar(el, GUIDES.filter(g => isGuideRead(g.slug)).length, GUIDES.length, '📚');
}

function toggleDone(el, key, cls, doneLabel, notDoneLabel) {
  const now = localStorage.getItem(key) !== '1';
  localStorage.setItem(key, now ? '1' : '0');
  el.classList.toggle(cls, now);
  el.querySelector('button').textContent = now ? doneLabel : notDoneLabel;
}

function renderGuides() {
  const list = document.getElementById('guides-list');
  if (!list) return;
  list.innerHTML = '';
  GUIDES.forEach(g => {
    const el = document.createElement('article');
    el.className = 'guide' + (isGuideRead(g.slug) ? ' read' : '');
    el.innerHTML = `
      <div class="guide-head">
        <span class="guide-ico">${g.icon}</span>
        <div class="guide-intro">
          <h4>${g.title}</h4>
          <p class="guide-sum">${g.summary}</p>
          <span class="guide-meta">📖 ${g.minutes} min read</span>
        </div>
        <span class="caret">▸</span>
      </div>
      <div class="guide-body">
        ${g.body}
        <button class="guide-read" type="button">${isGuideRead(g.slug) ? '✓ Read' : 'Mark as read'}</button>
      </div>`;
    el.querySelector('.guide-head').addEventListener('click', () => el.classList.toggle('open'));
    el.querySelector('.guide-read').addEventListener('click', () => {
      toggleDone(el, guideReadKey(g.slug), 'read', '✓ Read', 'Mark as read');
      updateGuideProgress();
    });
    list.appendChild(el);
  });
  updateGuideProgress();
}

if (document.getElementById('guides-list')) renderGuides();

/* ---------- Glossary ---------- */
// [term, short summary, extended explanation]
// GLOSSARY is defined in data.js (loaded before this file)

// Group each term by topic so people can browse, not just search.
// CATS is defined in data.js (loaded before this file)
// TERM_CAT is defined in data.js (loaded before this file)

const termSlug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const learnedKey = t => uidPrefix() + 'learned.' + termSlug(t);
const isLearned = t => localStorage.getItem(learnedKey(t)) === '1';

let glossCat = 'All';
let glossQuery = '';

function updateGlossProgress() {
  const el = document.getElementById('glossary-progress');
  if (!el) return;
  renderPctBar(el, GLOSSARY.filter(([t]) => isLearned(t)).length, GLOSSARY.length, '🎓');
}

function renderGlossCats() {
  const c = document.getElementById('glossary-cats');
  if (!c) return;
  c.innerHTML = CATS.map(cat =>
    `<button type="button" class="gloss-chip${cat === glossCat ? ' active' : ''}" data-cat="${cat}">${cat}</button>`).join('');
}

function renderGlossary() {
  const list = document.getElementById('glossary-list');
  const q = glossQuery.trim().toLowerCase();
  const items = GLOSSARY.filter(([t, d, ext]) => {
    const catOk = glossCat === 'All' || TERM_CAT[t] === glossCat;
    const qOk = !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q) || (ext && ext.toLowerCase().includes(q));
    return catOk && qOk;
  });
  if (!items.length) { list.innerHTML = '<p class="sub">No terms match your search.</p>'; return; }
  list.innerHTML = '';
  items.forEach(([t, d, ext]) => {
    const el = document.createElement('div');
    el.className = 'term' + (isLearned(t) ? ' learned' : '');
    el.innerHTML = `
      <div class="term-head">
        <h4>${t}</h4>
        <span class="caret">▸</span>
      </div>
      <p>${d}</p>
      <p class="term-ext">${ext}</p>
      <button class="term-learn" type="button">${isLearned(t) ? '✓ Learned' : 'Mark as learned'}</button>`;
    el.querySelector('.term-head').addEventListener('click', () => el.classList.toggle('open'));
    el.querySelector('.term-learn').addEventListener('click', () => {
      toggleDone(el, learnedKey(t), 'learned', '✓ Learned', 'Mark as learned');
      updateGlossProgress();
    });
    list.appendChild(el);
  });
}

const glossarySearch = document.getElementById('glossary-search');
if (glossarySearch) {
  glossarySearch.addEventListener('input', e => { glossQuery = e.target.value; renderGlossary(); });
  const cats = document.getElementById('glossary-cats');
  if (cats) cats.addEventListener('click', e => {
    const chip = e.target.closest('.gloss-chip');
    if (!chip) return;
    glossCat = chip.dataset.cat;
    cats.querySelectorAll('.gloss-chip').forEach(b => b.classList.toggle('active', b === chip));
    renderGlossary();
  });
  renderGlossCats();
  renderGlossary();
  updateGlossProgress();
}

/* ---------- Monthly Payment Calculator ---------- */
const calcForm = document.getElementById('calc-form');
if (calcForm) {
  calcForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const price = +f.price.value;
    const downPct = +f.down.value;
    const loan = price * (1 - downPct / 100);
    const pi = monthlyPI(loan, +f.rate.value, +f.term.value);
    const tax = price * (+f.tax.value / 100) / 12;
    const ins = +f.insurance.value / 12;
    const pmi = downPct < 20 ? loan * 0.005 / 12 : 0;
    const total = pi + tax + ins + pmi;

    const parts = [
      ['Principal & interest', pi, 'var(--sage)'],
      ['Property tax', tax, 'var(--clay)'],
      ['Home insurance', ins, 'var(--gold)'],
    ];
    if (pmi > 0) parts.push(['PMI', pmi, 'var(--danger)']);
    const max = Math.max(...parts.map(p => p[1]));

    const el = document.getElementById('calc-result');
    if (el) {
      el.classList.remove('hidden');
      el.innerHTML = `
      <div class="bd-total">
        <span>Estimated monthly payment</span>
        <span class="num">${money(total)}</span>
      </div>
      <div class="breakdown">
        ${parts.map(([label, amt, color]) => `
          <div class="bd-row">
            <span>${label}</span>
            <span class="bd-track"><span class="bd-fill" style="width:${(amt / max * 100).toFixed(1)}%;background:${color}"></span></span>
            <span class="bd-amt">${money(amt)}/mo</span>
          </div>`).join('')}
      </div>
      <p class="sub" style="margin:16px 0 0">On a ${money(loan)} loan (${downPct}% down on ${money(price)}).
      ${pmi > 0 ? 'Reaching 20% equity removes PMI. ' : ''}Estimates only - a lender provides exact figures.</p>
    `;
    }
  });
}

/* ---------- Down Payment Savings Goal ---------- */
const savingsKey = () => uidPrefix() + "savings";

function renderSavings(vals) {
  const goal = vals.price * (vals.goalpct / 100);
  const remaining = Math.max(0, goal - vals.current);
  const pct = goal > 0 ? Math.min(100, Math.round(vals.current / goal * 100)) : 0;
  const months = vals.monthly > 0 ? Math.ceil(remaining / vals.monthly) : Infinity;

  let dateStr = 'set a monthly amount to project a date';
  if (months === 0) {
    dateStr = 'You\'ve hit your goal - you\'re ready!';
  } else if (Number.isFinite(months)) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    dateStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const C = 2 * Math.PI * 52;
  const offset = C * (1 - pct / 100);

  const el = document.getElementById('savings-result');
  if (el) {
    el.classList.remove('hidden');
    el.innerHTML = `
    <div class="savings-flex">
      <svg class="ring" width="120" height="120" viewBox="0 0 120 120">
        <circle class="ring-track" cx="60" cy="60" r="52"></circle>
        <circle class="ring-fill" cx="60" cy="60" r="52"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
        <text class="ring-pct" x="60" y="68" text-anchor="middle">${pct}%</text>
      </svg>
      <div class="savings-detail">
        <p>Goal: <strong>${money(goal)}</strong> &nbsp;•&nbsp; Saved: <strong>${money(vals.current)}</strong></p>
        <p>Still to save: <strong>${money(remaining)}</strong>${Number.isFinite(months) && months > 0 ? ` over ~${months} month${months === 1 ? '' : 's'}` : ''}</p>
        <p style="margin-top:10px">You'll be ready around<br><span class="savings-date">${dateStr}</span></p>
      </div>
    </div>
    <p class="sub" style="margin:18px 0 0">Your goal is saved in this browser, so your progress is here when you come back.</p>
  `;
  }
}

function restoreSavings(f, res) {
  const saved = localStorage.getItem(savingsKey());
  if (!saved) return false;
  try {
    const vals = JSON.parse(saved);
    f.price.value = vals.price;
    f.goalpct.value = vals.goalpct;
    f.current.value = vals.current;
    f.monthly.value = vals.monthly;
    renderSavings(vals);
  } catch (_) { /* ignore corrupt data */ }
  return true;
}

const savingsForm = document.getElementById('savings-form');
if (savingsForm) {
  savingsForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const vals = { price: +f.price.value, goalpct: +f.goalpct.value, current: +f.current.value, monthly: +f.monthly.value };
    localStorage.setItem(savingsKey(), JSON.stringify(vals));
    renderSavings(vals);
  });

  // Restore a saved savings goal on load.
  restoreSavings(savingsForm);
}

/* ---------- FAQ ---------- */
// FAQ is defined in data.js (loaded before this file)

function renderFaq() {
  const list = document.getElementById('faq-list');
  list.innerHTML = '';
  FAQ.forEach(([q, a]) => {
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.innerHTML = `
      <div class="faq-q">${q} <span class="caret">▸</span></div>
      <div class="faq-a">${a}</div>`;
    item.querySelector('.faq-q').addEventListener('click', () => item.classList.toggle('open'));
    list.appendChild(item);
  });
}

if (document.getElementById('faq-list')) renderFaq();

// Re-render progress-dependent UI when the signed-in account changes (called by auth.js).
window.getkeydRefreshProgress = function () {
  if (document.getElementById("journey-list")) renderJourney();
  const f = document.getElementById("savings-form");
  const res = document.getElementById("savings-result");
  if (f && res) {
    if (!restoreSavings(f, res)) {
      f.reset();
      res.classList.add("hidden");
      res.innerHTML = "";
    }
  }
};

/* ---------- Contact form (stays on-site via Formspree AJAX) ---------- */
const contactForm = document.getElementById('contact-form');if (contactForm) {
  const result = document.getElementById('contact-result');
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    // Honeypot: bots fill every field; humans never see this one (Formspree ignores filled _gotcha).
    const gotcha = contactForm.querySelector('[name="_gotcha"]');
    if (gotcha && gotcha.value) return;
    // Throttle: one message per 30s per browser, so a stuck double-click can't double-send.
    let last = 0;
    try { last = +localStorage.getItem('getkeyd.contactLast') || 0; } catch (_) {}
    if (Date.now() - last < 30000) return;
    const btn = contactForm.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        try { localStorage.setItem('getkeyd.contactLast', Date.now()); } catch (_) {}
        contactForm.style.display = 'none';
        if (result) {
          result.classList.remove('hidden');
          result.innerHTML = `
          <div class="verdict ready">✓ Message sent!</div>
          <p class="sub" style="margin:0">Thanks for reaching out - we'll get back to you soon.</p>`;
        }
      } else {
        throw new Error('submit failed');
      }
    } catch (_) {
      if (result) {
        result.classList.remove('hidden');
        result.innerHTML = `
        <div class="verdict work">Something went wrong.</div>
        <p class="sub" style="margin:0">Please try again in a moment, or email us directly.</p>`;
      }
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

/* ---------- Print (journey page) ---------- */
const printBtn = document.getElementById('print-btn');
if (printBtn) printBtn.addEventListener('click', () => window.print());
