/* getkeyd - Find a Local Pro directory.
   Data: data/pros.json (refreshed from WA L&I + HUD by scripts/refresh-pros.py).
   Location search runs against the local wa-zip-lookup.json index - no external
   API calls, so this page works offline and needs no CSP additions. */

(function () {
  const search = document.getElementById('pros-search');
  if (!search) return;

  /* ---- DOM refs ---- */
  const loadingOverlay = document.getElementById('loading-overlay');
  const heroSubtitle = document.getElementById('hero-subtitle');
  const prosForm = document.getElementById('pros-form');
  const catsEl = document.getElementById('pros-cats');
  const heroLoader = document.getElementById('hero-loader');
  const errorEl = document.getElementById('pros-error');
  const errorMsg = document.getElementById('pros-error-msg');
  const resultsPanel = document.getElementById('pros-results');
  const emptyEl = document.getElementById('pros-empty');
  const toolbar = document.getElementById('pros-toolbar');
  const copyLinkBtn = document.getElementById('pros-copy-link');
  const printBtn = document.getElementById('pros-print');
  const ageEl = document.getElementById('pros-age');
  const timestampEl = document.getElementById('pros-timestamp');
  const sourcesFooter = document.getElementById('pros-sources-footer');
  const sortSelect = document.getElementById('pros-sort');
  const licenseFilterSelect = document.getElementById('pros-license-filter');
  const websiteOnlyCheck = document.getElementById('pros-website-only');
  const resetBtn = document.getElementById('pros-reset');
  const zipInput = document.getElementById('pros-zip');

  const SECTIONS = {
    'Handyman': { id: 'sec-handyman', list: 'list-handyman', heading: 'Handymen' },
    'Home Inspector': { id: 'sec-inspector', list: 'list-inspector', heading: 'Home Inspectors' },
    'Housing Counselor': { id: 'sec-counselor', list: 'list-counselor', heading: 'Housing Counselors' },
  };

  let PROS = [], ZIPLOOKUP = {}, cat = 'All', service = '', zip = '';
  let sortBy = 'name', licenseFilter = 'all', websiteOnly = false;
  let searchTimer = null;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(iso) {
    const d = iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')) : null;
    if (!d || isNaN(d.getTime())) return iso || '';
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  Promise.all([
    fetch('../data/pros.json').then(r => r.json()),
    fetch('../data/wa-zip-lookup.json').then(r => r.json()),
  ]).then(([data, zipLookup]) => {
    PROS = data.pros || [];
    ZIPLOOKUP = zipLookup;

    const categories = (data.categories || []).filter(c => SECTIONS[c]);

    /* ---- Chips: All + each category ---- */
    const cats = ['All'].concat(categories);
    catsEl.innerHTML = cats.map(c =>
      `<button type="button" class="gloss-chip${c === cat ? ' active' : ''}" data-cat="${c}">${escapeHtml(c)}</button>`
    ).join('');
    catsEl.addEventListener('click', e => {
      const chip = e.target.closest('.gloss-chip');
      if (!chip) return;
      cat = chip.dataset.cat;
      catsEl.querySelectorAll('.gloss-chip').forEach(b => b.classList.toggle('active', b === chip));
      render();
    });

    /* ---- Debounced service search (250ms) ---- */
    search.addEventListener('input', () => {
      if (heroLoader) heroLoader.classList.remove('hidden');
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        service = search.value.trim().toLowerCase();
        render();
        if (heroLoader) heroLoader.classList.add('hidden');
        googleEnrich();
      }, 250);
    });

    /* ---- Debounced ZIP search ---- */
    if (zipInput) {
      zipInput.addEventListener('input', () => {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          zip = zipInput.value.replace(/[^0-9]/g, '');
          render();
        }, 250);
      });
    }

    if (prosForm) {
      prosForm.addEventListener('submit', e => {
        e.preventDefault();
        service = search.value.trim().toLowerCase();
        zip = (zipInput ? zipInput.value.replace(/[^0-9]/g, '') : '');
        if (heroLoader) heroLoader.classList.remove('hidden');
        setTimeout(() => { if (heroLoader) heroLoader.classList.add('hidden'); }, 400);
        render();
      });
    }

    /* ---- Toolbar ---- */
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        const params = [];
        if (service) params.push('q=' + encodeURIComponent(service));
        if (zip) params.push('z=' + encodeURIComponent(zip));
        const url = location.origin + location.pathname + (params.length ? '?' + params.join('&') : '');
        const done = () => {
          const orig = copyLinkBtn.textContent;
          copyLinkBtn.textContent = 'Copied!';
          setTimeout(() => { copyLinkBtn.textContent = orig; }, 1500);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done, done);
        } else {
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (err) {}
          document.body.removeChild(ta);
          done();
        }
      });
    }
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    /* ---- Sidebar: sort + filters ---- */
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        sortBy = sortSelect.value;
        render();
      });
    }
    if (licenseFilterSelect) {
      licenseFilterSelect.addEventListener('change', () => {
        licenseFilter = licenseFilterSelect.value;
        render();
      });
    }
    if (websiteOnlyCheck) {
      websiteOnlyCheck.addEventListener('change', () => {
        websiteOnly = websiteOnlyCheck.checked;
        render();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sortBy = 'name';
        licenseFilter = 'all';
        websiteOnly = false;
        service = '';
        zip = '';
        search.value = '';
        if (zipInput) zipInput.value = '';
        if (sortSelect) sortSelect.value = 'name';
        if (licenseFilterSelect) licenseFilterSelect.value = 'all';
        if (websiteOnlyCheck) websiteOnlyCheck.checked = false;
        render();
      });
    }

    /* ---- Static text once data loads ---- */
    if (ageEl) ageEl.textContent = 'Updated ' + fmtDate(data.lastUpdated);
    if (timestampEl) timestampEl.textContent = data.lastUpdated || '';
    if (sourcesFooter) {
      sourcesFooter.innerHTML =
        'Handyman listings: WA L&amp;I contractor registry · Counselors: HUD-approved list · ' +
        'Listed businesses are not employed, insured, or endorsed by getkeyd.';
    }
    if (heroSubtitle) {
      heroSubtitle.textContent = PROS.length + ' licensed pros across Washington · updated ' +
        fmtDate(data.lastUpdated);
      heroSubtitle.classList.remove('hidden');
    }

    /* ---- Support ?q= (service) and ?z= (zip) URLs from copy-link ---- */
    const urlParams = new URLSearchParams(location.search);
    const urlQ = urlParams.get('q');
    const urlZ = urlParams.get('z');
    if (urlQ) {
      service = urlQ;
      search.value = urlQ;
    }
    if (urlZ) {
      zip = urlZ;
      if (zipInput) zipInput.value = urlZ;
    }

    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    render();
  }).catch(() => {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    if (heroSubtitle) heroSubtitle.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    if (errorMsg) {
      errorMsg.textContent = "Couldn't load the directory. Please check your connection and try again in a moment.";
    }
  });

  // Service keyword → category. L&I only licenses handymen as "HANDYMAN", so the
  // match is to the license category, not a claim the pro does that specific work.
  const TRADE_KEYS = [
    ['home inspection', 'Home Inspector'], ['inspection', 'Home Inspector'], ['inspector', 'Home Inspector'],
    ['counseling', 'Housing Counselor'], ['counsel', 'Housing Counselor'], ['counselor', 'Housing Counselor'],
    ['housing', 'Housing Counselor'], ['mortgage', 'Housing Counselor'], ['credit', 'Housing Counselor'],
    ['homebuyer', 'Housing Counselor'], ['down payment', 'Housing Counselor'], ['foreclosure', 'Housing Counselor'],
    ['budget', 'Housing Counselor'], ['loan', 'Housing Counselor'],
    ['plumb', 'Handyman'], ['pipe', 'Handyman'], ['leak', 'Handyman'], ['water heater', 'Handyman'],
    ['electric', 'Handyman'], ['wiring', 'Handyman'], ['outlet', 'Handyman'], ['lighting', 'Handyman'],
    ['paint', 'Handyman'], ['drywall', 'Handyman'], ['sheetrock', 'Handyman'], ['floor', 'Handyman'],
    ['tile', 'Handyman'], ['kitchen', 'Handyman'], ['bathroom', 'Handyman'], ['remodel', 'Handyman'],
    ['reno', 'Handyman'], ['roof', 'Handyman'], ['gutter', 'Handyman'], ['deck', 'Handyman'], ['fence', 'Handyman'],
    ['door', 'Handyman'], ['window', 'Handyman'], ['lock', 'Handyman'], ['assembly', 'Handyman'],
    ['furniture', 'Handyman'], ['install', 'Handyman'], ['mount', 'Handyman'], ['tv', 'Handyman'],
    ['repair', 'Handyman'], ['fix', 'Handyman'], ['maintenance', 'Handyman'], ['contractor', 'Handyman'],
    ['handyman', 'Handyman'], ['general', 'Handyman'],
  ];

  function serviceCategory(q) {
    for (let i = 0; i < TRADE_KEYS.length; i++) {
      if (q.includes(TRADE_KEYS[i][0])) return TRADE_KEYS[i][1];
    }
    return '';
  }

  function matchesService(p) {
    if (!service) return true;
    if (p.name && p.name.toLowerCase().includes(service)) return true;
    const cat = serviceCategory(service);
    return cat ? p.category === cat : false;
  }

  function matchesZip(p) {
    if (!zip) return true;
    const z = p.zip || '';
    return z.startsWith(zip) || (zip.length >= 3 && z.startsWith(zip.slice(0, 3)));
  }

  // "98115" → "Seattle (98115)" when the zip is in the local lookup, else "ZIP 98115".
  function zipLabel() {
    const zl = ZIPLOOKUP[zip];
    return zl ? zl.city + ' (' + zip + ')' : 'ZIP ' + zip;
  }

  // Category order for the "Category" sort = SECTIONS insertion order.
  const CATEGORY_RANK = Object.keys(SECTIONS).reduce((m, c, i) => { m[c] = i; return m; }, {});

  function matchesFilters(p) {
    if (licenseFilter === 'licensed' && !p.license) return false;
    if (licenseFilter === 'hud' && p.source !== 'hud') return false;
    if (websiteOnly && !(p.website || p.email)) return false;
    return true;
  }

  function sortList(arr) {
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (sortBy === 'city') {
        const d = (a.city || '').localeCompare(b.city || '');
        if (d) return d;
      } else if (sortBy === 'category') {
        const d = (CATEGORY_RANK[a.category] ?? Infinity) - (CATEGORY_RANK[b.category] ?? Infinity);
        if (d) return d;
      } else if (sortBy === 'verified') {
        const va = a.lastVerified || '', vb = b.lastVerified || '';
        if (va && vb) {
          const d = vb.localeCompare(va);
          if (d) return d;
        } else if (va) return -1;
        else if (vb) return 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted;
  }

  function render() {
    const sorted = sortList(PROS);
    const filtered = licenseFilter !== 'all' || websiteOnly;
    const visibleCats = cat === 'All' ? Object.keys(SECTIONS) : (SECTIONS[cat] ? [cat] : []);
    let total = 0;

    visibleCats.forEach(c => {
      const sec = SECTIONS[c];
      const list = sorted.filter(p => p.category === c && matchesService(p) && matchesZip(p) && matchesFilters(p));
      total += list.length;

      const sectionEl = document.getElementById(sec.id);
      const listEl = document.getElementById(sec.list);
      if (!sectionEl || !listEl) return;

      sectionEl.style.display = list.length ? '' : 'none';
      if (list.length) {
        const heading = sectionEl.querySelector('.section-heading');
        if (heading) {
          const near = zip ? ' near ' + zipLabel() : '';
          heading.textContent = sec.heading + near + ' · ' + list.length;
        }
        listEl.innerHTML = list.map(proCard).join('');
      } else {
        listEl.innerHTML = '';
      }
    });

    const hasResults = total > 0;
    if (resultsPanel) resultsPanel.classList.toggle('hidden', !hasResults);
    if (emptyEl) emptyEl.classList.toggle('hidden', hasResults);

    if (heroSubtitle) {
      if (service || zip || cat !== 'All' || filtered) {
        const parts = [];
        if (service) parts.push('"' + service + '"');
        if (zip) parts.push('near ' + zipLabel());
        if (cat !== 'All') parts.push(cat);
        if (filtered) parts.push('filtered');
        heroSubtitle.textContent = total + ' of ' + PROS.length + ' pros match' +
          (parts.length ? ' · ' + parts.join(' · ') : '');
      } else {
        heroSubtitle.textContent = PROS.length + ' licensed pros across Washington · updated ' +
          fmtDate(PROS[0] ? PROS[0].lastVerified : '');
      }
    }
  }

  // Deterministic colored initial avatar (the site's auth avatars use the same
  // idea; L&I/HUD don't provide photos, so a stable monogram stands in).
  function avatarFor(name) {
    let h = 0;
    const n = String(name || '?');
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    return '<span class="pro-avatar" style="background:hsl(' + h + ',42%,52%)" aria-hidden="true">' +
      escapeHtml((n.charAt(0) || '?').toUpperCase()) + '</span>';
  }

  function proCard(p) {
    const where = [p.city, p.county].filter(Boolean).join(', ') +
      (p.zip ? ', WA ' + p.zip : '');
    const actions = [];
    if (p.phone) {
      actions.push('<a href="tel:+' + escapeHtml(p.phone.replace(/[^0-9]/g, '')) + '" class="pro-action">📞 Call</a>');
    }
    if (p.website) {
      actions.push('<a href="' + escapeHtml(p.website) + '" target="_blank" rel="noopener" class="pro-action">🌐 Website</a>');
    }
    if (p.email) {
      actions.push('<a href="mailto:' + escapeHtml(p.email) + '" class="pro-action">✉️ Email</a>');
    }
    let license = '';
    if (p.license) {
      license = 'L&I #' + escapeHtml(p.license) + ' · ' +
        '<a href="https://secure.lni.wa.gov/verify/" target="_blank" rel="noopener">Verify with L&I</a>';
    } else if (p.source === 'hud') {
      license = 'HUD-approved · ' +
        '<a href="https://www.hud.gov/i_want_to/talk_to_a_housing_counselor" target="_blank" rel="noopener">About HUD approval</a>';
    }
    return '<div class="stat-pair pro-card">' +
        '<div class="stat">' +
          '<div class="num pro-name-row">' + avatarFor(p.name) +
            '<span>' + escapeHtml(p.name) + '</span></div>' +
          '<div class="lbl">' + escapeHtml(p.category) + ' · ' + escapeHtml(where) + '</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="lbl">' + actions.join('') + '</div>' +
          (license ? '<div class="lbl">' + license + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  /* ---- Google Places enrichment (OPTIONAL, off by default) ----
     Set window.__GK_GOOGLE = { enabled: true, endpoint: '<worker url>' } in
     js/proxy-config.js after deploying worker/places-worker.js. Live per-search
     fetches only (Google ToS forbids caching), merged into their own section. */
  const googleCfg = (typeof window.__GK_GOOGLE === 'object' && window.__GK_GOOGLE) ? window.__GK_GOOGLE : { enabled: false, endpoint: '' };

  function googleSection() {
    let sec = document.getElementById('sec-google');
    if (sec) return sec;
    sec = document.createElement('section');
    sec.className = 'result-section';
    sec.id = 'sec-google';
    sec.innerHTML = '<div class="section-head"><div class="section-head-line"></div>' +
      '<h3 class="section-heading">Local Businesses (Google)</h3></div>' +
      '<div id="list-google" class="pro-list"></div>';
    if (resultsPanel) resultsPanel.appendChild(sec);
    return sec;
  }

  function googleCard(g) {
    const actions = [];
    if (g.phone) actions.push('<a href="tel:+' + escapeHtml(g.phone.replace(/[^0-9]/g, '')) + '" class="pro-action">📞 Call</a>');
    if (g.website) actions.push('<a href="' + escapeHtml(g.website) + '" target="_blank" rel="noopener" class="pro-action">🌐 Website</a>');
    const rating = (g.rating != null)
      ? '★ ' + escapeHtml(String(g.rating)) + (g.reviewCount ? ' (' + escapeHtml(String(g.reviewCount)) + ')' : '')
      : 'Listed on Google';
    return '<div class="stat-pair pro-card">' +
        '<div class="stat">' +
          '<div class="num">' + escapeHtml(g.name) + '</div>' +
          '<div class="lbl">' + escapeHtml(g.address || '') + '</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="lbl">' + actions.join('') + '</div>' +
          '<div class="lbl">' + rating + '</div>' +
        '</div>' +
      '</div>';
  }

  function googleEnrich() {
    if (!googleCfg.enabled || !googleCfg.endpoint || !service) return;
    fetch(googleCfg.endpoint + '?q=' + encodeURIComponent(service + ' home services'), { signal: AbortSignal.timeout(12000) })
      .then(r => { if (!r.ok) throw new Error('google ' + r.status); return r.json(); })
      .then(data => {
        const results = (data && data.results) || [];
        if (!results.length) return;
        // Dedupe against official listings by normalized name+city.
        const known = new Set(PROS.map(p => (p.name + '|' + (p.city || '')).toLowerCase()));
        const fresh = results.filter(g => !known.has((g.name + '|' + (g.city || '')).toLowerCase()));
        if (!fresh.length) return;
        const listEl = googleSection().querySelector('#list-google');
        if (listEl) listEl.innerHTML = fresh.map(googleCard).join('');
        googleSection().style.display = '';
      })
      .catch(() => { /* optional layer — fail silently */ });
  }

  // Fire Google enrichment alongside every debounced search.
})();
