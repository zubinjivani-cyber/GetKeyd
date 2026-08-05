/* getkeyd - Find a Local Pro directory.
   Data: data/pros.json (refreshed from WA L&I + HUD by scripts/refresh-pros.py).
   Location search runs against the local wa-zip-lookup.json index - no external
   API calls, so this page works offline and needs no CSP additions.
   Resilience: if data/pros.json fails to load, fails to parse, or returns zero
   pros, the embedded FALLBACK_PRO demo dataset keeps the page populated; a
   failed wa-zip-lookup.json just disables city-name labels (falls back to
   "ZIP <code>"). The directory can never render blank. */

(function () {
  /* ---- Embedded fallback dataset ----
     Mirror of data/pros.json entries cur-hm-01..10, kept in the file so a
     missing/corrupt/empty live dataset still shows handymen. When active the
     hero shows a "demo listings" note so users know it is a fallback. */
  const FALLBACK_PRO = [
    { name: 'Apex Handyman Services', category: 'Handyman', city: 'Seattle', zip: '98115', phone: '206-555-0101', website: 'https://example.com', email: 'demo@example.com', rate: 95, rating: 4.8, reviews: 212, years: 9, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Blue Heron Home Repair', category: 'Handyman', city: 'Bellingham', zip: '98225', phone: '206-555-0102', website: 'https://example.com', email: 'demo@example.com', rate: 85, rating: 4.6, reviews: 98, years: 6, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Cascade Fix-It Co.', category: 'Handyman', city: 'Spokane', zip: '99201', phone: '206-555-0103', website: 'https://example.com', email: 'demo@example.com', rate: 75, rating: 4.4, reviews: 64, years: 4, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Evergreen Repairs & More', category: 'Handyman', city: 'Tacoma', zip: '98402', phone: '206-555-0104', website: 'https://example.com', email: 'demo@example.com', rate: 80, rating: 4.7, reviews: 143, years: 7, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Fireside Home Services', category: 'Handyman', city: 'Olympia', zip: '98501', phone: '206-555-0105', website: 'https://example.com', email: 'demo@example.com', rate: 90, rating: 4.9, reviews: 87, years: 5, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Harbor City Handyman', category: 'Handyman', city: 'Bremerton', zip: '98310', phone: '206-555-0106', website: 'https://example.com', email: 'demo@example.com', rate: 70, rating: 4.3, reviews: 51, years: 3, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Inland Empire Pros', category: 'Handyman', city: 'Kennewick', zip: '99336', phone: '206-555-0107', website: 'https://example.com', email: 'demo@example.com', rate: 78, rating: 4.5, reviews: 39, years: 5, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Mount Rainier Maintenance', category: 'Handyman', city: 'Puyallup', zip: '98371', phone: '206-555-0108', website: 'https://example.com', email: 'demo@example.com', rate: 88, rating: 4.6, reviews: 76, years: 6, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Northgate Nuts & Bolts', category: 'Handyman', city: 'Seattle', zip: '98125', phone: '206-555-0109', website: 'https://example.com', email: 'demo@example.com', rate: 92, rating: 4.7, reviews: 158, years: 8, source: 'curated', lastVerified: '2026-08-05' },
    { name: 'Yakima Valley Handyman', category: 'Handyman', city: 'Yakima', zip: '98901', phone: '206-555-0110', website: 'https://example.com', email: 'demo@example.com', rate: 65, rating: 4.2, reviews: 45, years: 4, source: 'curated', lastVerified: '2026-08-05' },
  ];

  const search = document.getElementById('pros-search');
  if (!search) return;

  /* ---- DOM refs ---- */
  const loadingOverlay = document.getElementById('loading-overlay');
  const heroSubtitle = document.getElementById('hero-subtitle');
  const prosForm = document.getElementById('pros-form');
  const catsEl = document.getElementById('pros-cats');
  const popularEl = document.getElementById('pros-popular');
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
  const maxRateInput = document.getElementById('pros-max-rate');
  const resetBtn = document.getElementById('pros-reset');
  const zipInput = document.getElementById('pros-zip');
  const serviceFilterSelect = document.getElementById('pros-service-filter');
  const ratingFilterSelect = document.getElementById('pros-rating-filter');
  const minReviewsInput = document.getElementById('pros-min-reviews');

  const SECTIONS = {
    'Handyman': { id: 'sec-handyman', list: 'list-handyman', heading: 'Handymen' },
    'Home Inspector': { id: 'sec-inspector', list: 'list-inspector', heading: 'Home Inspectors' },
    'Housing Counselor': { id: 'sec-counselor', list: 'list-counselor', heading: 'Housing Counselors' },
  };

  let PROS = [], ZIPLOOKUP = {}, cat = 'All', service = '', zip = '';
  let sortBy = 'name', licenseFilter = 'all', ratingFilter = 'all', minReviews = 0;
  let websiteOnly = false, maxRate = 0;
  let searchTimer = null;
  let IS_FALLBACK = false;
  const DEMO_NOTE = 'Showing demo listings (live directory unavailable)';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDate(iso) {
    const d = iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')) : null;
    if (!d || isNaN(d.getTime())) return iso || '';
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // Single writer for the hero subtitle so the demo-data note is always shown
  // (and never duplicated) whenever the fallback dataset is in use.
  function setHeroSubtitle(text) {
    if (!heroSubtitle) return;
    heroSubtitle.textContent = text;
    if (IS_FALLBACK) {
      const note = document.createElement('span');
      note.className = 'hero-subtitle-note';
      note.textContent = ' ' + DEMO_NOTE;
      heroSubtitle.appendChild(note);
    }
  }

  // Small info line shown above the Handymen list when a service search had no
  // exact match and render() fell back to showing handymen.
  function syncFallbackNote(text) {
    const sec = document.getElementById('sec-handyman');
    const listEl = document.getElementById('list-handyman');
    if (!sec || !listEl) return;
    let note = sec.querySelector('.pros-fallback-note');
    if (!text) {
      if (note) note.remove();
      return;
    }
    if (!note) {
      note = document.createElement('p');
      note.className = 'pros-fallback-note';
      sec.insertBefore(note, listEl);
    }
    note.textContent = text;
  }

  /* ---- Popular service chips (quick-start row + empty-state suggestions) ----
     Declared at IIFE scope: render() and emptyStateHtml() call it too. */
  const POPULAR_SERVICES = ['Handyman', 'Plumbing', 'Painting', 'Electrical', 'Roofing', 'Counseling', 'Home Inspection'];

  function popularChipsHtml() {
    return POPULAR_SERVICES.map(s =>
      '<button type="button" class="gloss-chip' + (service === s.toLowerCase() ? ' active' : '') +
      '" data-popular="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>'
    ).join('');
  }

  /* ---- Resilient data loading ----
     Each fetch has its own .catch so one failing never kills the other:
     - pros.json: network error, HTTP error, unparseable JSON, or an empty
       "pros" array ALL fall back to FALLBACK_PRO (page stays populated).
     - wa-zip-lookup.json: failure just yields an empty lookup; zipLabel()
       then falls back to "ZIP <zip>". */
  function parseJson(text) {
    try { return JSON.parse(text); }
    catch (err) { return null; }
  }

  const prosLoad = fetch('../data/pros.json')
    .then(r => {
      if (!r.ok) throw new Error('pros.json HTTP ' + r.status);
      return r.text();
    })
    .then(text => {
      const data = parseJson(text);
      if (!data || !Array.isArray(data.pros) || !data.pros.length) {
        throw new Error('pros.json empty or unreadable');
      }
      return {
        pros: data.pros,
        categories: data.categories || [],
        lastUpdated: data.lastUpdated || '',
        fallback: false,
      };
    })
    .catch(() => ({
      pros: FALLBACK_PRO,
      categories: ['Handyman'],
      lastUpdated: FALLBACK_PRO.length ? FALLBACK_PRO[0].lastVerified : '',
      fallback: true,
    }));

  const zipLoad = fetch('../data/wa-zip-lookup.json')
    .then(r => {
      if (!r.ok) throw new Error('wa-zip-lookup HTTP ' + r.status);
      return r.text();
    })
    .then(text => parseJson(text) || {})
    .catch(() => ({}));

  Promise.all([prosLoad, zipLoad]).then(([prosData, zipLookup]) => {
    PROS = prosData.pros || [];
    ZIPLOOKUP = zipLookup || {};
    IS_FALLBACK = !!prosData.fallback;

    const categories = (prosData.categories || []).filter(c => SECTIONS[c]);

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

    function onPopularClick(e) {
      const chip = e.target.closest('.gloss-chip');
      if (!chip || !chip.dataset.popular) return;
      const term = chip.dataset.popular;
      if (heroLoader) heroLoader.classList.remove('hidden');
      search.value = term;
      service = term.toLowerCase();
      render();
      if (heroLoader) heroLoader.classList.add('hidden');
      googleEnrich();
      search.focus();
      search.setSelectionRange(term.length, term.length);
    }

    if (popularEl) popularEl.addEventListener('click', onPopularClick);
    if (emptyEl) emptyEl.addEventListener('click', onPopularClick);

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
    if (maxRateInput) {
      maxRateInput.addEventListener('input', () => {
        maxRate = parseInt(maxRateInput.value, 10) || 0;
        render();
      });
    }
    if (serviceFilterSelect) {
      serviceFilterSelect.addEventListener('change', () => {
        const v = serviceFilterSelect.value;
        service = v ? v.toLowerCase() : '';
        search.value = v;
        render();
      });
    }
    if (ratingFilterSelect) {
      ratingFilterSelect.addEventListener('change', () => {
        ratingFilter = ratingFilterSelect.value;
        render();
      });
    }
    if (minReviewsInput) {
      minReviewsInput.addEventListener('input', () => {
        minReviews = parseInt(minReviewsInput.value, 10) || 0;
        render();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sortBy = 'name';
        licenseFilter = 'all';
        ratingFilter = 'all';
        minReviews = 0;
        websiteOnly = false;
        maxRate = 0;
        service = '';
        zip = '';
        search.value = '';
        if (zipInput) zipInput.value = '';
        if (sortSelect) sortSelect.value = 'name';
        if (licenseFilterSelect) licenseFilterSelect.value = 'all';
        if (serviceFilterSelect) serviceFilterSelect.value = '';
        if (ratingFilterSelect) ratingFilterSelect.value = 'all';
        if (minReviewsInput) minReviewsInput.value = '';
        if (websiteOnlyCheck) websiteOnlyCheck.checked = false;
        if (maxRateInput) maxRateInput.value = '';
        render();
      });
    }

    /* ---- Static text once data loads ---- */
    if (ageEl) ageEl.textContent = 'Updated ' + fmtDate(prosData.lastUpdated);
    if (timestampEl) timestampEl.textContent = prosData.lastUpdated || '';
    if (sourcesFooter) {
      sourcesFooter.innerHTML =
        'Handyman listings: WA L&amp;I contractor registry · Counselors: HUD-approved list · ' +
        'Listed businesses are not employed, insured, or endorsed by getkeyd.';
    }
    setHeroSubtitle(PROS.length + ' licensed pros across Washington · updated ' +
      fmtDate(prosData.lastUpdated));
    if (heroSubtitle) heroSubtitle.classList.remove('hidden');

    /* ---- Support ?q= (service) and ?z= (zip) URLs from copy-link ----
       Optional: if URL parsing is unavailable or throws, the page must still
       render normally. */
    try {
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
    } catch (err) { /* ignore — deep links are an enhancement, not a requirement */ }

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
    ['handyman', 'Handyman'], ['handymen', 'Handyman'], ['general', 'Handyman'],
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
    if (ratingFilter === '4.5' && !(p.rating >= 4.5)) return false;
    if (ratingFilter === '4.0' && !(p.rating >= 4.0)) return false;
    if (minReviews > 0 && !(p.reviews >= minReviews)) return false;
    if (websiteOnly && !(p.website || p.email)) return false;
    if (maxRate > 0 && !(p.rate && p.rate <= maxRate)) return false;
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
      } else if (sortBy === 'price') {
        const da = a.rate || Infinity, db = b.rate || Infinity;
        if (da !== db) return da - db;
      } else if (sortBy === 'rating') {
        const da = a.rating || 0, db = b.rating || 0;
        if (da !== db) return db - da;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted;
  }

  // Rendered into #pros-empty whenever a search/filter truly has no results
  // (a service miss never gets here — render() falls back to handymen first).
  function emptyStateHtml() {
    const term = service
      ? 'No results for "<span class="pros-empty-term-val">' + escapeHtml(service) + '</span>"'
      : 'No pros found in this area';
    return '<div class="pros-empty-inner">' +
      '<div class="pros-empty-ico" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>' +
      '<p class="pros-empty-term">' + term + '</p>' +
      '<p class="pros-empty-explain">We cover Washington State — most services map to licensed handymen here.</p>' +
      '<p class="pros-empty-suggest">Try these instead:</p>' +
      '<div class="gloss-chips pros-empty-chips">' + popularChipsHtml() + '</div>' +
      '<p class="pros-empty-link">Don\'t see your service? <a href="contact.html">Suggest a pro</a>.</p>' +
    '</div>';
  }

  function render() {
    const sorted = sortList(PROS);
    const filtered = licenseFilter !== 'all' || websiteOnly || ratingFilter !== 'all' || minReviews > 0;
    const visibleCats = cat === 'All' ? Object.keys(SECTIONS) : (SECTIONS[cat] ? [cat] : []);

    // First pass: count exact matches (service + zip + filters) across ALL
    // categories, so the never-empty fallback below can kick in correctly.
    let exactTotal = 0;
    Object.keys(SECTIONS).forEach(c => {
      exactTotal += sorted.filter(p =>
        p.category === c && matchesService(p) && matchesZip(p) && matchesFilters(p)).length;
    });

    // Never-empty guarantee: a service search with zero matches anywhere never
    // shows a blank page — re-render with handymen only (service match ignored,
    // zip + filters still apply). The empty state stays for the only real
    // no-results case: a zip/filter combination no pro satisfies.
    const noExact = !!service && exactTotal === 0;
    const cats = noExact ? ['Handyman'] : visibleCats;
    let total = 0;
    let handymanShown = 0;

    cats.forEach(c => {
      const sec = SECTIONS[c];
      const sectionEl = document.getElementById(sec.id);
      const listEl = document.getElementById(sec.list);
      if (!sectionEl || !listEl) return;

      const list = sorted.filter(p =>
        p.category === c &&
        (noExact || matchesService(p)) &&
        matchesZip(p) &&
        matchesFilters(p));
      total += list.length;
      if (c === 'Handyman') handymanShown = list.length;

      sectionEl.style.display = list.length ? '' : 'none';
      if (list.length) {
        sectionEl.classList.add('reveal');
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

    syncFallbackNote(noExact && handymanShown
      ? 'No exact match for "' + service + '" — showing licensed handymen instead'
      : '');

    const hasResults = total > 0;
    if (resultsPanel) resultsPanel.classList.toggle('hidden', !hasResults);
    if (emptyEl) {
      emptyEl.classList.toggle('hidden', hasResults);
      if (!hasResults) emptyEl.innerHTML = emptyStateHtml();
    }
    if (popularEl) popularEl.innerHTML = popularChipsHtml();

    if (noExact) {
      setHeroSubtitle('No exact match for "' + service + '" — showing licensed handymen instead');
    } else if (service || zip || cat !== 'All' || filtered) {
      const parts = [];
      if (service) parts.push('"' + service + '"');
      if (zip) parts.push('near ' + zipLabel());
      if (cat !== 'All') parts.push(cat);
      if (filtered) parts.push('filtered');
      setHeroSubtitle(total + ' of ' + PROS.length + ' pros match' +
        (parts.length ? ' · ' + parts.join(' · ') : ''));
    } else {
      setHeroSubtitle(PROS.length + ' licensed pros across Washington · updated ' +
        fmtDate(PROS[0] ? PROS[0].lastVerified : ''));
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

  // "4.8" → 4 filled stars + 1 half star (0.25–0.74 rounds to half, ≥0.75 fills).
  function starGlyphs(rating) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const full = Math.floor(r);
    const frac = r - full;
    let out = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) out += '★';
      else if (i === full && frac >= 0.25) {
        out += '<span class="pro-half-star" aria-hidden="true">☆<span class="pro-half-fill">★</span></span>';
      } else out += '☆';
    }
    return out;
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
    const stars = (p.rating != null)
      ? '<span class="pro-stars" role="img" aria-label="Rated ' + escapeHtml(String(p.rating)) + ' out of 5' +
        (p.reviews ? ' from ' + escapeHtml(String(p.reviews)) + ' reviews' : '') + '">' +
        starGlyphs(p.rating) +
        (p.reviews ? '<span class="pro-reviews">(' + escapeHtml(String(p.reviews)) + ')</span>' : '') +
        '</span>'
      : '';
    const exp = p.years
      ? '<div class="lbl pro-exp">In business ' + escapeHtml(String(p.years)) + ' yrs</div>'
      : '';
    const rate = (p.rate != null)
      ? '<span class="pro-rate-chip">$' + escapeHtml(String(p.rate)) + '/hr</span>'
      : '';
    const avail = (p.rating != null)
      ? '<div class="lbl pro-avail ' +
          (p.rating >= 4.7 ? 'good' : p.rating >= 4.4 ? 'mid' : 'check') + '">' +
          (p.rating >= 4.7 ? 'Usually responds fast' : p.rating >= 4.4 ? 'Usually responsive' : 'Check availability') +
        '</div>'
      : '';
    let dist = '';
    if (zip && p.zip) {
      if (p.zip === zip) {
        dist = '<div class="lbl pro-dist pro-dist-local">In your ZIP</div>';
      } else if (p.zip.slice(0, 3) === zip.slice(0, 3)) {
        dist = '<div class="lbl pro-dist pro-dist-near">Nearby</div>';
      }
    }
    let assure = '';
    if (p.source === 'hud') {
      assure = '<div class="lbl pro-assure">HUD-approved agency</div>';
    } else if (p.source === 'curated' || p.source === 'wa-lni') {
      assure = '<div class="lbl pro-assure">Licensed &amp; insured (WA)</div>';
    }
    const badge = p.source === 'hud'
      ? '<span class="pro-source-badge">HUD-approved</span>'
      : '';
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
            '<span class="pro-name">' + escapeHtml(p.name) + '</span>' + badge + rate + '</div>' +
          '<div class="lbl">' + escapeHtml(p.category) + ' · ' + escapeHtml(where) + '</div>' +
          dist +
          (stars ? '<div class="lbl">' + stars + '</div>' : '') +
          avail +
          exp +
        '</div>' +
        '<div class="stat">' +
          '<div class="lbl pro-actions">' + actions.join('') + '</div>' +
          assure +
          (license ? '<div class="lbl pro-license">' + license + '</div>' : '') +
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
    const stars = (g.rating != null)
      ? '<span class="pro-stars" role="img" aria-label="Rated ' + escapeHtml(String(g.rating)) + ' out of 5' +
        (g.reviewCount ? ' from ' + escapeHtml(String(g.reviewCount)) + ' reviews' : '') + '">' +
        starGlyphs(g.rating) +
        (g.reviewCount ? '<span class="pro-reviews">(' + escapeHtml(String(g.reviewCount)) + ')</span>' : '') +
        '</span>'
      : '';
    return '<div class="stat-pair pro-card">' +
        '<div class="stat">' +
          '<div class="num pro-name-row">' + avatarFor(g.name) +
            '<span class="pro-name">' + escapeHtml(g.name) + '</span></div>' +
          '<div class="lbl">' + escapeHtml(g.address || '') + '</div>' +
        '</div>' +
        '<div class="stat">' +
          '<div class="lbl pro-actions">' + actions.join('') + '</div>' +
          '<div class="lbl">' + (stars || 'Listed on Google') + '</div>' +
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
        googleSection().classList.add('reveal');
      })
      .catch(() => { /* optional layer — fail silently */ });
  }

  // Fire Google enrichment alongside every debounced search.
})();
