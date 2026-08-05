/* getkeyd - property comparison. Inline mode on address.html. */
(function () {
  var input = document.getElementById('address-input');
  var form = document.getElementById('address-form');
  if (!input || !form) return;

  var toggle = document.getElementById('mode-toggle');
  var submitText = document.getElementById('submit-text');
  var iconSearch = document.getElementById('submit-icon-search');
  var iconCompare = document.getElementById('submit-icon-compare');
  var resultsEl = document.getElementById('address-results');
  var compareResults = document.getElementById('compare-results');
  var compareEmpty = document.getElementById('compare-empty');
  var tableWrap = document.getElementById('compare-table-wrap');
  var countEl = document.getElementById('compare-count');
  var dropdownBtn = document.getElementById('columns-dropdown-btn');
  var dropdownMenu = document.getElementById('columns-dropdown-menu');
  var heroSection = document.getElementById('hero');
  var heroEyebrow = document.getElementById('hero-eyebrow');
  var heroTitle = document.getElementById('hero-title');
  var heroSubtitle = document.getElementById('hero-subtitle');
  var heroStats = document.getElementById('hero-market-bar');
  var errorEl = document.getElementById('address-error');
  var errorMsg = document.getElementById('address-error-msg');
  var stickySearch = document.getElementById('sticky-search');

  var CENSUS_KEY = 'ff50eeb23aeb892c9f6e28d526adcd00912b4898';
  var MAX_PROPS = 5;

  var properties = [];
  var visibleColumns = {};
  var compareActive = false;

  /* ---- Column definitions ---- */
  var ALL_COLUMNS = [
    { id: 'city',     label: 'City',                 get: function (d) { return d.city || '\u2014'; } },
    { id: 'state',    label: 'State',                get: function (d) { return d.state || '\u2014'; } },
    { id: 'county',   label: 'County',               get: function (d) { return d.countyName || '\u2014'; } },
    { id: 'tract',    label: 'Census Tract',         get: function (d) { return d.tractGEOID ? d.tractGEOID.slice(-6) : '\u2014'; } },
    { id: 'medianValue', label: 'Median Home Value',  get: function (d) { return d.medianValue ? money(d.medianValue) : '\u2014'; } },
    { id: 'medianRent',  label: 'Median Rent',        get: function (d) { return d.medianRent ? money(d.medianRent) + '/mo' : '\u2014'; } },
    { id: 'ownerPct',    label: 'Owner-Occupied',     get: function (d) { return d.ownerPct != null ? d.ownerPct + '%' : '\u2014'; } },
    { id: 'yearBuilt',   label: 'Year Built',         get: function (d) { return d.medianYearBuilt || '\u2014'; } },
    { id: 'hhSize',      label: 'Avg Household Size', get: function (d) { return d.avgHHSize ? d.avgHHSize.toFixed(1) : '\u2014'; } },
    { id: 'totalUnits',  label: 'Housing Units',      get: function (d) { return d.totalHousingUnits ? d.totalHousingUnits.toLocaleString() : '\u2014'; } },
    { id: 'medianIncome',label: 'Median Income',      get: function (d) { return d.medianIncome ? money(d.medianIncome) : '\u2014'; } },
    { id: 'poverty',     label: 'Below Poverty',      get: function (d) { return d.popBelowPoverty ? d.popBelowPoverty.toLocaleString() : '\u2014'; } },
    { id: 'bachelors',   label: "Bachelor's+",        get: function (d) { return d.bachelors ? d.bachelors.toLocaleString() : '\u2014'; } }
  ];

  ALL_COLUMNS.forEach(function (c) {
    visibleColumns[c.id] = ['city','state','medianValue','medianRent','ownerPct','yearBuilt','medianIncome','bachelors'].indexOf(c.id) !== -1;
  });

  /* ---- API helpers ---- */
  function geocodeCensus(addr) {
    var url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=' +
      encodeURIComponent(addr) + '&benchmark=Public_AR_Current&format=json';
    return fetchJSON(url).then(function (d) {
      var m = d.result && d.result.addressMatches && d.result.addressMatches[0];
      if (!m) throw new Error('No match');
      return { lat: m.coordinates.y, lng: m.coordinates.x, addr: m.matchedAddress || addr };
    });
  }

  function geoLookup(lat, lng) {
    var url = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=' +
      lng + '&y=' + lat + '&benchmark=Public_AR_Current&vintage=Census2020_Current&format=json';
    return fetchJSON(url).then(function (d) {
      var g = d.result && d.result.geographies;
      if (!g) throw new Error('No geo');
      var t = g['Census Tracts'] && g['Census Tracts'][0];
      var c = g.Counties && g.Counties[0];
      var s = g.States && g.States[0];
      return { tractGEOID: t ? t.GEOID : '', stateFIPS: s ? s.STATE : '', countyFIPS: c ? c.COUNTY : '',
               countyName: c ? c.NAME : '', stateName: s ? s.NAME : '' };
    });
  }

  function geocodeNominatim(addr) {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
      encodeURIComponent(addr) + '&addressdetails=1&limit=1';
    return fetchJSON(url, { headers: { 'User-Agent': '(getkeyd.app)' } })
      .then(function (dd) {
        if (!dd || !dd.length) throw new Error('No Nominatim');
        var a = dd[0].address || {};
        return { lat: parseFloat(dd[0].lat), lng: parseFloat(dd[0].lon), addr: dd[0].display_name || addr,
                 city: a.city || '', state: a.state || '', zip: a.postcode || '', countyName: a.county || '' };
      });
  }

  function fetchACS(stateFIPS, countyFIPS, tractGEOID) {
    if (!stateFIPS || !countyFIPS || !tractGEOID) return Promise.resolve(null);
    var tract = tractGEOID.length === 11 ? tractGEOID.substring(5) : tractGEOID;
    var vars = 'B25077_001E,B25035_001E,B25064_001E,B25003_002E,B25003_001E,B25010_001E,B25002_001E,B19013_001E,B17021_002E,B15003_022E';
    var url = 'https://api.census.gov/data/2022/acs/acs5?get=' + vars +
      '&for=tract:' + encodeURIComponent(tract) +
      '&in=state:' + encodeURIComponent(stateFIPS) +
      '&in=county:' + encodeURIComponent(countyFIPS) + '&key=' + CENSUS_KEY;
    return fetchJSON(url).then(function (dd) {
      if (!dd || dd.length < 2) return null;
      var row = dd[1];
      var occ = parseFloat(row[3]) || 0, total = parseFloat(row[4]) || 1;
      return {
        medianValue: parseFloat(row[0]) || 0, medianYearBuilt: parseFloat(row[1]) || 0,
        medianRent: parseFloat(row[2]) || 0, ownerPct: Math.round(occ / total * 100),
        avgHHSize: parseFloat(row[5]) || 0, totalHousingUnits: parseFloat(row[6]) || 0,
        medianIncome: parseFloat(row[7]) || 0, popBelowPoverty: parseFloat(row[8]) || 0,
        bachelors: parseFloat(row[9]) || 0
      };
    }).catch(function () { return null; });
  }

  /* ---- Mode switching ---- */
  function setMode(mode) {
    compareActive = (mode === 'compare');

    toggle.querySelectorAll('.mode-toggle-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    if (compareActive) {
      toggle.classList.add('compare-active');
      submitText.textContent = 'Add to Compare';
      iconSearch.classList.add('hidden');
      iconCompare.classList.remove('hidden');
      input.placeholder = 'Add an address to compare\u2026';
      if (resultsEl) resultsEl.classList.add('hidden');
      if (stickySearch) stickySearch.classList.remove('visible');
      if (heroSection) heroSection.classList.remove('shrink');
      if (errorEl) errorEl.classList.add('hidden');
      if (heroTitle) { heroTitle.classList.remove('hidden'); heroTitle.textContent = 'Compare Properties'; }
      if (heroSubtitle) heroSubtitle.classList.add('hidden');
      if (heroEyebrow) heroEyebrow.classList.remove('hidden');
      if (heroStats) heroStats.classList.remove('hidden');
      refreshCompareUI();
    } else {
      toggle.classList.remove('compare-active');
      submitText.textContent = 'Search Address';
      iconSearch.classList.remove('hidden');
      iconCompare.classList.add('hidden');
      input.placeholder = '123 Main St, Anytown, ST 12345';
      if (compareResults) compareResults.classList.add('hidden');
      if (compareEmpty) compareEmpty.classList.add('hidden');
      if (heroEyebrow) heroEyebrow.classList.remove('hidden');
      if (heroTitle) { heroTitle.classList.remove('hidden'); heroTitle.textContent = 'Address Searcher'; }
      if (heroSubtitle) heroSubtitle.classList.add('hidden');
      if (heroStats) heroStats.classList.remove('hidden');
      if (errorEl) errorEl.classList.add('hidden');
      if (heroSection && heroSection.dataset.resultsActive === 'true') {
        if (resultsEl) resultsEl.classList.remove('hidden');
        if (heroSection) heroSection.classList.add('shrink');
        if (stickySearch) stickySearch.classList.add('visible');
      }
    }
  }

  function refreshCompareUI() {
    if (!compareActive) return;
    if (!properties.length) {
      if (compareEmpty) compareEmpty.classList.remove('hidden');
      if (compareResults) compareResults.classList.add('hidden');
      return;
    }
    if (compareEmpty) compareEmpty.classList.add('hidden');
    if (compareResults) compareResults.classList.remove('hidden');
    if (heroSection) heroSection.classList.add('shrink');
    countEl.textContent = properties.length + ' / ' + MAX_PROPS + ' properties';

    var activeCols = ALL_COLUMNS.filter(function (c) { return visibleColumns[c.id]; });
    var html = '<table class="compare-table"><thead><tr>';
    html += '<th class="compare-th compare-th-drag"></th>';
    html += '<th class="compare-th compare-th-fixed">Address</th>';
    html += '<th class="compare-th compare-th-action"></th>';
    activeCols.forEach(function (c) {
      html += '<th class="compare-th">' + escapeHtml(c.label) + '</th>';
    });
    html += '</tr></thead><tbody>';

    properties.forEach(function (prop, idx) {
      html += '<tr class="compare-row" draggable="true" data-idx="' + idx + '">';
      html += '<td class="compare-td compare-td-drag"><span class="compare-drag-handle" title="Drag to reorder">\u2630</span></td>';
      html += '<td class="compare-td compare-td-fixed">' +
        '<div class="compare-addr">' + escapeHtml(prop.address) + '</div>' +
        '<div class="compare-addr-sub">' + escapeHtml(prop.displayAddr && prop.displayAddr.length > 50 ? prop.displayAddr.substring(0, 47) + '\u2026' : (prop.displayAddr || '')) + '</div>' +
        '</td>';
      html += '<td class="compare-td compare-td-action">' +
        '<button class="compare-remove-btn" data-idx="' + idx + '" title="Remove">\u00d7</button></td>';
      activeCols.forEach(function (c) {
        html += '<td class="compare-td">' + escapeHtml(c.get(prop)) + '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    tableWrap.innerHTML = html;

    tableWrap.querySelectorAll('.compare-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        properties.splice(parseInt(btn.dataset.idx), 1);
        refreshCompareUI();
      });
    });

    // Drag-to-reorder
    var rows = tableWrap.querySelectorAll('.compare-row');
    var dragSrc = null;
    rows.forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        dragSrc = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', function () {
        this.classList.remove('dragging');
        rows.forEach(function (r) { r.classList.remove('drag-over'); });
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (this !== dragSrc) this.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function () {
        this.classList.remove('drag-over');
      });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        if (dragSrc === this) return;
        var fromIdx = parseInt(dragSrc.dataset.idx);
        var toIdx = parseInt(this.dataset.idx);
        var moved = properties.splice(fromIdx, 1)[0];
        properties.splice(toIdx, 0, moved);
        var tbody = this.parentNode;
        if (fromIdx < toIdx) {
          tbody.insertBefore(dragSrc, this.nextSibling);
        } else {
          tbody.insertBefore(dragSrc, this);
        }
        tbody.querySelectorAll('.compare-row').forEach(function (r, i) { r.dataset.idx = i; });
        dragSrc = null;
      });
    });

  }

  /* ---- Dropdown column picker ---- */
  function buildDropdownMenu() {
    var html = '';
    ALL_COLUMNS.forEach(function (c) {
      html += '<label class="column-dropdown-item">' +
        '<input type="checkbox" ' + (visibleColumns[c.id] ? 'checked' : '') + ' data-col="' + c.id + '">' +
        '<span>' + escapeHtml(c.label) + '</span></label>';
    });
    dropdownMenu.innerHTML = html;

    dropdownMenu.querySelectorAll('input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        visibleColumns[cb.dataset.col] = cb.checked;
        refreshCompareUI();
      });
    });
  }

  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasHidden = dropdownMenu.classList.contains('hidden');
      dropdownMenu.classList.toggle('hidden');
      if (wasHidden) buildDropdownMenu();
    });
  }
  document.addEventListener('click', function (e) {
    if (dropdownMenu && !dropdownMenu.classList.contains('hidden') &&
        !dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
      dropdownMenu.classList.add('hidden');
    }
  });

  /* ---- Add property ---- */
  function addProperty(addr, callback) {
    if (properties.length >= MAX_PROPS) { if (callback) callback(null); return; }

    function addNominatim(n) {
      var d = { address: addr, displayAddr: n.addr, lat: n.lat, lng: n.lng,
        city: n.city, state: n.state, zip: n.zip, countyName: n.countyName, tractGEOID: '' };
      properties.push(d);
      if (callback) callback(d);
    }

    geocodeCensus(addr).then(function (geo) {
      return geoLookup(geo.lat, geo.lng).then(function (lookup) {
        return fetchACS(lookup.stateFIPS, lookup.countyFIPS, lookup.tractGEOID).then(function (acs) {
          var parts = geo.addr.split(',');
          var d = { address: addr, displayAddr: geo.addr, lat: geo.lat, lng: geo.lng,
            tractGEOID: lookup.tractGEOID, countyName: lookup.countyName, stateName: lookup.stateName,
            city: (parts[1] || '').trim(), state: (parts[2] || '').trim().split(' ')[0] || '', zip: '' };
          if (acs) Object.assign(d, acs);
          properties.push(d);
          if (callback) callback(d);
        });
      });
    }).catch(function () {
      return geocodeNominatim(addr).then(addNominatim);
    }).catch(function () { if (callback) callback(null); });
  }

  /* ---- Toggle buttons ---- */
  if (toggle) {
    toggle.querySelectorAll('.mode-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.dataset.mode);
      });
    });
  }

  /* ---- Intercept form submit in compare mode ---- */
  form.addEventListener('submit', function (e) {
    if (!compareActive) return;
    e.stopPropagation();
    e.preventDefault();
    var addr = input.value.trim();
    if (!addr) return;
    if (properties.length >= MAX_PROPS) {
      if (errorEl && errorMsg) { errorMsg.textContent = 'Maximum ' + MAX_PROPS + ' properties allowed.'; errorEl.classList.remove('hidden'); }
      return;
    }
    addProperty(addr, function () {
      input.value = '';
      refreshCompareUI();
    });
  }, { capture: true });

  /* ---- Suggestions ---- */
  document.querySelectorAll('.compare-suggestion').forEach(function (btn) {
    btn.addEventListener('click', function () {
      input.value = btn.dataset.addr;
      form.dispatchEvent(new Event('submit'));
    });
  });

  /* ---- URL hash: if #compare, switch to compare mode ---- */
  if (location.hash === '#compare') {
    setMode('compare');
  }

  window.addEventListener('hashchange', function () {
    if (location.hash === '#compare') {
      setMode('compare');
    } else if (location.hash === '' || location.hash === '#search') {
      setMode('search');
    }
  });

})();
