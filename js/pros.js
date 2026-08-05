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
  const locateCard = document.getElementById('pros-locate');
  const locateBtn = document.getElementById('pros-locate-btn');
  const locateSkip = document.getElementById('pros-locate-skip');

  const SECTIONS = {
    'Handyman': { id: 'sec-handyman', list: 'list-handyman', heading: 'Handymen' },
    'Home Inspector': { id: 'sec-inspector', list: 'list-inspector', heading: 'Home Inspectors' },
    'Housing Counselor': { id: 'sec-counselor', list: 'list-counselor', heading: 'Housing Counselors' },
  };

  let PROS = [], ZIPLOOKUP = {}, cat = 'All', query = '';
  let sortBy = 'name', licenseFilter = 'all', websiteOnly = false;
  let searchTimer = null;

  // City index built from zip-lookup (city → county) so searches on either work.
  let cityIndex = {}; // "seattle" → "King County"

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
    Object.values(zipLookup).forEach(z => {
      const key = z.city.toLowerCase();
      if (!cityIndex[key]) cityIndex[key] = z.county;
    });
    // Also index cities that only appear in pros data (statewide L&I cities).
    PROS.forEach(p => {
      const key = p.city.toLowerCase();
      if (!cityIndex[key] && p.county) cityIndex[key] = p.county;
    });

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

    /* ---- Debounced search (250ms, like the address page autocomplete) ---- */
    search.addEventListener('input', () => {
      if (heroLoader) heroLoader.classList.remove('hidden');
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        query = search.value.trim();
        render();
        if (heroLoader) heroLoader.classList.add('hidden');
        googleEnrich();
      }, 250);
    });

    if (prosForm) {
      prosForm.addEventListener('submit', e => e.preventDefault());
    }

    /* ---- Toolbar ---- */
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        const url = location.origin + location.pathname +
          (query ? '?q=' + encodeURIComponent(query) : '');
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
        query = '';
        search.value = '';
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

    /* ---- Location-first: geolocate + reverse-geocode via Photon ---- */
    const hideLocate = () => { if (locateCard) locateCard.classList.add('hidden'); };
    const failLocate = () => {
      hideLocate();
      if (heroSubtitle) {
        heroSubtitle.textContent = "We couldn't get your location — search by city or ZIP above.";
        heroSubtitle.classList.remove('hidden');
      }
      if (search) search.focus();
    };

    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        if (locateBtn.disabled) return;
        locateBtn.disabled = true;
        locateBtn.textContent = 'Locating…';
        const onErr = () => failLocate();
        if (!navigator.geolocation) { failLocate(); return; }
        try {
          navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            fetch('https://photon.komoot.io/reverse?lon=' + lng + '&lat=' + lat + '&limit=1')
              .then(r => r.json())
              .then(data => {
                const props = (data.features && data.features[0] && data.features[0].properties) || {};
                const city = (props.city || props.county || props.name || '').trim();
                if (!city) { onErr(); return; }
                try { localStorage.setItem('getkeyd.prosCity', city); } catch (err) {}
                search.value = city;
                query = city;
                hideLocate();
                if (heroSubtitle) {
                  heroSubtitle.textContent = 'Showing pros near ' + city;
                  heroSubtitle.classList.remove('hidden');
                }
                render();
              })
              .catch(onErr);
          }, onErr, { timeout: 10000, maximumAge: 600000 });
        } catch (err) {
          failLocate();
        }
      });
    }

    if (locateSkip) {
      locateSkip.addEventListener('click', () => {
        hideLocate();
        if (search) search.focus();
      });
    }

    /* ---- Support ?q= URLs from copy-link ---- */
    const urlQ = new URLSearchParams(location.search).get('q');
    if (urlQ) {
      query = urlQ;
      search.value = urlQ;
    } else {
      /* ---- Location-first flow: prompt unless ?q= or a saved city exists ---- */
      let savedCity = '';
      try { savedCity = (localStorage.getItem('getkeyd.prosCity') || '').trim(); } catch (err) {}
      if (savedCity) {
        query = savedCity;
        search.value = savedCity;
      } else if (locateCard) {
        locateCard.classList.remove('hidden');
      }
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

  function matchesQuery(p) {
    if (!query) return true;
    const q = query.toLowerCase();
    const city = (p.city || '').toLowerCase();
    const county = (p.county || '').toLowerCase();
    const countyOfCity = (cityIndex[p.city.toLowerCase()] || '').toLowerCase();
    if (p.city && city.includes(q)) return true;
    if (p.county && county.includes(q)) return true;
    if (countyOfCity && countyOfCity.includes(q)) return true;
    if (p.zip && p.zip.startsWith(q)) return true;
    if (p.name && p.name.toLowerCase().includes(q)) return true;
    return false;
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
      const list = sorted.filter(p => p.category === c && matchesQuery(p) && matchesFilters(p));
      total += list.length;

      const sectionEl = document.getElementById(sec.id);
      const listEl = document.getElementById(sec.list);
      if (!sectionEl || !listEl) return;

      sectionEl.style.display = list.length ? '' : 'none';
      if (list.length) {
        const heading = sectionEl.querySelector('.section-heading');
        if (heading) {
          heading.textContent = sec.heading + (query ? ' in ' + query : '') + ' · ' + list.length;
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
      if (query || cat !== 'All' || filtered) {
        heroSubtitle.textContent = total + ' of ' + PROS.length + ' pros match' +
          (query ? ' "' + query + '"' : '') +
          (cat !== 'All' ? ' · ' + cat : '') +
          (filtered ? ' · filtered' : '');
      } else {
        heroSubtitle.textContent = PROS.length + ' licensed pros across Washington · updated ' +
          fmtDate(PROS[0] ? PROS[0].lastVerified : '');
      }
    }
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
          '<div class="num">' + escapeHtml(p.name) + '</div>' +
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
    if (!googleCfg.enabled || !googleCfg.endpoint || !query) return;
    fetch(googleCfg.endpoint + '?q=' + encodeURIComponent(query + ' home services'), { signal: AbortSignal.timeout(12000) })
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
