/* getkeyd - nationwide address search & property lookup.
   Multi-layered real API data: Census geocoder / ACS,
   ArcGIS parcels (where available), Overpass building
   footprints, and NWS weather. Works for ANY US address. */

(function () {
  var form = document.getElementById('address-form');
  if (!form) return;

  /* ---- DOM refs ---- */
  var input = document.getElementById('address-input');
  var errorEl = document.getElementById('address-error');
  var errorMsg = document.getElementById('address-error-msg');
  var results = document.getElementById('address-results');
  var submitBtn = form.querySelector('button[type="submit"]');
  var dataDisclaimer = document.getElementById('data-disclaimer');
  var dataAge = document.getElementById('data-age');
  var dataTimestamp = document.getElementById('data-timestamp');
  var nonKingNote = document.getElementById('non-king-county-note');
  var sourcesFooter = document.getElementById('data-sources-footer');

  /* ---- Enhanced DOM refs ---- */
  var heroLoader = document.getElementById('hero-loader');
  var loadingOverlay = document.getElementById('loading-overlay');
  var heroSection = document.getElementById('hero');
  var heroEyebrow = document.getElementById('hero-eyebrow');
  var heroTitle = document.getElementById('hero-title');
  var heroSubtitle = document.getElementById('hero-subtitle');
  var heroStats = document.getElementById('hero-market-bar');
  var hashLoading = document.getElementById('hash-loading');
  var progressFill = document.getElementById('search-progress-fill');
  var gkLoaderText = document.querySelector('.gk-loader-text');
  var inputGroup = document.querySelector('.hero-input-group');
  var resultsToast = document.getElementById('results-toast');
  var copyLinkBtn = document.getElementById('copy-link-btn');
  var printResultsBtn = document.getElementById('print-results-btn');
  var errorRetry = document.getElementById('error-retry');
  var stickySearch = document.getElementById('sticky-search');

  /* ---- Constants ---- */
  var CENSUS_KEY = 'ff50eeb23aeb892c9f6e28d526adcd00912b4898';
  var CACHE_PREFIX = 'gk_addr_';
  var CACHE_TTL = 3600000;
  var NWS_UA = '(getkeyd.app)';

  /* ---- State abbreviation maps ---- */
  var FIPS_TO_ABBR = {
    '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
    '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA',
    '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
    '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
    '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI',
    '45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
    '54':'WV','55':'WI','56':'WY'
  };

  var STATE_NAME_TO_ABBR = {
    'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
    'colorado':'CO','connecticut':'CT','delaware':'DE','district of columbia':'DC',
    'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
    'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
    'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN',
    'mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
    'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
    'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR',
    'pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',
    'tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA',
    'washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY'
  };

  var STATE_EDU_URLS = {
    'AL':'https://www.alabamaachieves.org/',
    'AK':'https://education.alaska.gov/',
    'AZ':'https://www.azed.gov/',
    'AR':'https://dese.ade.arkansas.gov/',
    'CA':'https://www.cde.ca.gov/',
    'CO':'https://www.cde.state.co.us/',
    'CT':'https://portal.ct.gov/SDE',
    'DE':'https://www.doe.k12.de.us/',
    'FL':'https://www.fldoe.org/',
    'GA':'https://www.gadoe.org/',
    'HI':'https://www.hawaiipublicschools.org/',
    'ID':'https://www.sde.idaho.gov/',
    'IL':'https://www.isbe.net/',
    'IN':'https://www.doe.in.gov/',
    'IA':'https://educate.iowa.gov/',
    'KS':'https://www.ksde.org/',
    'KY':'https://education.ky.gov/',
    'LA':'https://www.louisianabelieves.com/',
    'ME':'https://www.maine.gov/doe/',
    'MD':'https://www.marylandpublicschools.org/',
    'MA':'https://www.doe.mass.edu/',
    'MI':'https://www.michigan.gov/mde/',
    'MN':'https://education.mn.gov/',
    'MS':'https://www.mdek12.org/',
    'MO':'https://dese.mo.gov/',
    'MT':'https://opi.mt.gov/',
    'NE':'https://www.education.ne.gov/',
    'NV':'https://doe.nv.gov/',
    'NH':'https://www.education.nh.gov/',
    'NJ':'https://www.nj.gov/education/',
    'NM':'https://webnew.ped.state.nm.us/',
    'NY':'https://www.nysed.gov/',
    'NC':'https://www.dpi.nc.gov/',
    'ND':'https://www.nd.gov/dpi/',
    'OH':'https://education.ohio.gov/',
    'OK':'https://sde.ok.gov/',
    'OR':'https://www.oregon.gov/ode/',
    'PA':'https://www.education.pa.gov/',
    'RI':'https://ride.ri.gov/',
    'SC':'https://ed.sc.gov/',
    'SD':'https://doe.sd.gov/',
    'TN':'https://www.tn.gov/education.html',
    'TX':'https://tea.texas.gov/',
    'UT':'https://www.schools.utah.gov/',
    'VT':'https://education.vermont.gov/',
    'VA':'https://www.doe.virginia.gov/',
    'WA':'https://www.k12.wa.us/',
    'DC':'https://osse.dc.gov/',
    'WV':'https://wvde.us/',
    'WI':'https://dpi.wi.gov/',
    'WY':'https://edu.wyoming.gov/'
  };

  /* ---- Known ArcGIS county assessor map ---- */
  var ARCGIS_COUNTY_MAP = {
    '53033': {
      countyName: 'King County',
      stateAbbr: 'WA',
      parcelUrl: 'https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/2/query',
      salesUrl: 'https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/3/query',
      assessorUrl: 'https://blue.kingcounty.com/Assessor/eRealProperty',
      hasParcelData: true
    },
    '06037': {
      countyName: 'Los Angeles County',
      stateAbbr: 'CA',
      assessorUrl: 'https://assessor.lacounty.gov/',
      hasParcelData: false
    },
    '17031': {
      countyName: 'Cook County',
      stateAbbr: 'IL',
      assessorUrl: 'https://www.cookcountyassessor.com/',
      hasParcelData: false
    },
    '04013': {
      countyName: 'Maricopa County',
      stateAbbr: 'AZ',
      assessorUrl: 'https://mcassessor.maricopa.gov/',
      hasParcelData: false
    }
  };

  function getStateAbbr(geo) {
    if (geo.stateFIPS && FIPS_TO_ABBR[geo.stateFIPS]) return FIPS_TO_ABBR[geo.stateFIPS];
    if (geo.stateName && STATE_NAME_TO_ABBR[geo.stateName.toLowerCase().trim()]) {
      return STATE_NAME_TO_ABBR[geo.stateName.toLowerCase().trim()];
    }
    return '';
  }

  function getFipsKey(geo) {
    if (!geo.stateFIPS || !geo.countyFIPS) return '';
    return geo.stateFIPS + geo.countyFIPS;
  }

  function isKingCounty(geo) { return getFipsKey(geo) === '53033'; }

  function getCountyAssessorUrl(geo) {
    var fipsKey = getFipsKey(geo);
    if (fipsKey && ARCGIS_COUNTY_MAP[fipsKey] && ARCGIS_COUNTY_MAP[fipsKey].assessorUrl) {
      return ARCGIS_COUNTY_MAP[fipsKey].assessorUrl;
    }
    var abbr = getStateAbbr(geo);
    var county = (geo.countyName || '').replace(/ county$/i, '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (abbr && county) {
      return 'https://www.' + county + '.' + abbr.toLowerCase() + '.gov';
    }
    return '';
  }

  function getStateEdUrl(geo) {
    var abbr = getStateAbbr(geo);
    if (!abbr) return '';
    if (STATE_EDU_URLS[abbr]) return STATE_EDU_URLS[abbr];
    return 'https://www.' + abbr.toLowerCase() + '.gov/education';
  }

  /* ---- Helpers ---- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function fmtDate(y, m, d) {
    return MONTHS[m - 1] + ' ' + d + ', ' + y;
  }

  /* ---- Cache (sessionStorage, 1-hour expiry) ---- */
  function cacheKey(q) {
    return CACHE_PREFIX + q.toLowerCase().trim();
  }

  function getCache(q) {
    try {
      var raw = sessionStorage.getItem(cacheKey(q));
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data._ts > CACHE_TTL) {
        sessionStorage.removeItem(cacheKey(q));
        return null;
      }
      return data;
    } catch (e) { return null; }
  }

  function setCache(q, data) {
    try {
      data._ts = Date.now();
      sessionStorage.setItem(cacheKey(q), JSON.stringify(data));
    } catch (e) {}
  }

  /* ---- NProgress-style bar ---- */
  function startProgress() {
    if (!progressFill) return;
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        progressFill.style.transition = 'width 12s cubic-bezier(0.1, 0.05, 0, 1)';
        progressFill.style.width = '85%';
      });
    });
  }
  function completeProgress() {
    if (!progressFill) return;
    progressFill.style.transition = 'width 0.45s ease';
    progressFill.style.width = '100%';
    setTimeout(function () {
      progressFill.style.transition = 'none';
      progressFill.style.width = '0%';
    }, 550);
  }
  function resetProgress() {
    if (!progressFill) return;
    progressFill.style.transition = 'width 0.2s ease';
    progressFill.style.width = '0%';
  }

  /* ---- Toast ---- */
  var toastTimer = null;
  function showToast(msg) {
    if (!resultsToast) return;
    resultsToast.textContent = msg;
    resultsToast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      resultsToast.classList.remove('show');
    }, 2200);
  }

  /* ---- Placeholder cycling ---- */
  var placeholders = [
    '123 Main St, Seattle, WA',
    '350 5th Ave, New York, NY',
    '1 Infinite Loop, Cupertino, CA',
    '1600 Pennsylvania Ave, Washington, DC',
    '11 Wall St, New York, NY',
    '600 Montgomery St, San Francisco, CA'
  ];
  var placeholderIdx = 0;
  var placeholderInterval;

  function advancePlaceholder() {
    if (!input) return;
    placeholderIdx = (placeholderIdx + 1) % placeholders.length;
    input.placeholder = placeholders[placeholderIdx];
  }
  function startPlaceholderCycle() {
    if (placeholderInterval) clearInterval(placeholderInterval);
    placeholderInterval = setInterval(advancePlaceholder, 3200);
  }
  function stopPlaceholderCycle() {
    if (placeholderInterval) clearInterval(placeholderInterval);
    placeholderInterval = null;
  }
  startPlaceholderCycle();

  /* ---- Address autocomplete via Photon (free, no key) ---- */
  var autocompleteDropdown = document.getElementById('autocomplete-dropdown');
  var autocompleteTimer = null;
  var autocompleteSelectedIdx = -1;

  function hideAutocomplete() {
    if (autocompleteDropdown) autocompleteDropdown.classList.add('hidden');
    autocompleteSelectedIdx = -1;
  }

  function showAutocomplete(items) {
    if (!autocompleteDropdown || !items.length) { hideAutocomplete(); return; }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += '<div class="autocomplete-item" data-idx="' + i + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:8px;color:var(--muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<span>' + escapeHtml(items[i].label) + '</span>' +
        '<span style="margin-left:auto;font-size:0.72rem;color:var(--muted);">' + escapeHtml(items[i].city || '') + ' ' + escapeHtml(items[i].state || '') + '</span>' +
        '</div>';
    }
    autocompleteDropdown.innerHTML = html;
    autocompleteDropdown.classList.remove('hidden');
    autocompleteSelectedIdx = -1;
  }

  if (input) {
    input.addEventListener('input', function () {
      var val = input.value.trim();
      if (val.length < 3) { hideAutocomplete(); return; }
      if (autocompleteTimer) clearTimeout(autocompleteTimer);
      autocompleteTimer = setTimeout(function () {
        var q = input.value;
        fetchJSON('https://photon.komoot.io/api/?q=' + encodeURIComponent(q.trim()) + '&limit=5&lang=en')
          .then(function (data) {
            if (input.value !== q) return;
            if (!data || !data.features) { hideAutocomplete(); return; }
            var items = [];
            for (var i = 0; i < data.features.length; i++) {
              var f = data.features[i];
              var p = f.properties || {};
              var label = p.label || p.name || '';
              if (!label) continue;
              items.push({
                label: label,
                city: p.city || '',
                state: p.state || '',
                lat: f.geometry ? f.geometry.coordinates[1] : 0,
                lng: f.geometry ? f.geometry.coordinates[0] : 0
              });
            }
            showAutocomplete(items);
          }).catch(function () { hideAutocomplete(); });
      }, 250);
    });

    input.addEventListener('keydown', function (e) {
      var items = autocompleteDropdown ? autocompleteDropdown.querySelectorAll('.autocomplete-item') : [];
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        autocompleteSelectedIdx = Math.min(autocompleteSelectedIdx + 1, items.length - 1);
        updateAutocompleteHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        autocompleteSelectedIdx = Math.max(autocompleteSelectedIdx - 1, 0);
        updateAutocompleteHighlight(items);
      } else if (e.key === 'Enter' && autocompleteSelectedIdx >= 0) {
        e.preventDefault();
        var selected = items[autocompleteSelectedIdx];
        input.value = selected.querySelector('span').textContent;
        hideAutocomplete();
        form.dispatchEvent(new Event('submit'));
      } else if (e.key === 'Escape') {
        hideAutocomplete();
      }
    });
  }

  function updateAutocompleteHighlight(items) {
    for (var i = 0; i < items.length; i++) {
      if (i === autocompleteSelectedIdx) {
        items[i].classList.add('active');
      } else {
        items[i].classList.remove('active');
      }
    }
  }

  if (autocompleteDropdown) {
    autocompleteDropdown.addEventListener('click', function (e) {
      var item = e.target.closest('.autocomplete-item');
      if (item) {
        input.value = item.querySelector('span').textContent;
        hideAutocomplete();
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  if (inputGroup) {
    document.addEventListener('click', function (e) {
      if (e.target.closest('.mode-toggle')) return;
      if (!inputGroup.contains(e.target) && !(autocompleteDropdown && autocompleteDropdown.contains(e.target))) {
        hideAutocomplete();
      }
    });
  }

  /* ---- End autocomplete ---- */

  /* ================================================================
     LAYER 1: Geocoding
     ================================================================ */

  function geocodeCensus(address) {
    var url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=' +
      encodeURIComponent(address) + '&benchmark=Public_AR_Current&format=json';

    return fetchJSON(url).then(function (data) {
      var matches = data.result && data.result.addressMatches;
      if (!matches || !matches.length) throw new Error('No address match in Census');
      var m = matches[0];
      return {
        lat: m.coordinates.y,
        lng: m.coordinates.x,
        normalizedAddress: m.matchedAddress || '',
        components: m.addressComponents || {}
      };
    });
  }

  function censusGeoLookup(lat, lng) {
    var url = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=' +
      lng + '&y=' + lat + '&benchmark=Public_AR_Current&vintage=Census2020_Current&format=json';

    return fetchJSON(url).then(function (data) {
      var geos = data.result && data.result.geographies;
      if (!geos) throw new Error('No geographies in GeoLookup');

      var tract = geos['Census Tracts'] && geos['Census Tracts'][0];
      var county = geos.Counties && geos.Counties[0];
      var state = geos.States && geos.States[0];

      return {
        tractGEOID: tract ? tract.GEOID : '',
        tractName: tract ? tract.NAME : '',
        stateFIPS: state ? state.STATE : (tract ? tract.STATE : ''),
        countyFIPS: county ? county.COUNTY : (tract ? tract.COUNTY : ''),
        countyName: county ? county.NAME : '',
        stateName: state ? state.NAME : ''
      };
    });
  }

  function geocodeNominatim(address) {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
      encodeURIComponent(address) + '&addressdetails=1&limit=1';
    var opts = { headers: { 'User-Agent': NWS_UA } };

    return fetchJSON(url, opts).then(function (data) {
      if (!data || !data.length) throw new Error('No Nominatim results');
      var r = data[0];
      var addr = r.address || {};
      return {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        normalizedAddress: r.display_name || '',
        stateFIPS: '',
        countyFIPS: '',
        tractGEOID: '',
        tractName: '',
        countyName: addr.county || '',
        stateName: addr.state || '',
        city: addr.city || addr.town || addr.village || '',
        zip: addr.postcode || '',
        source: 'Nominatim / OpenStreetMap'
      };
    });
  }

  function geocodePhoton(address) {
    var url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(address) +
      '&limit=1&lang=en';

    return fetchJSON(url).then(function (data) {
      if (!data.features || !data.features.length) throw new Error('No Photon results');
      var f = data.features[0];
      var props = f.properties || {};
      var coords = f.geometry && f.geometry.coordinates;

      return {
        lat: coords ? coords[1] : 0,
        lng: coords ? coords[0] : 0,
        normalizedAddress: props.label || (props.name + ', ' + (props.street || '') + ', ' +
          (props.city || '') + ', ' + (props.state || '') + ' ' + (props.postcode || '')),
        stateFIPS: '',
        countyFIPS: '',
        tractGEOID: '',
        tractName: '',
        countyName: props.county || '',
        stateName: props.state || '',
        city: props.city || '',
        zip: props.postcode || '',
        source: 'Photon / Komoot'
      };
    });
  }

  function geocodeAddress(address) {
    return geocodeCensus(address).then(function (census) {
      return censusGeoLookup(census.lat, census.lng).then(function (geo) {
        return {
          lat: census.lat,
          lng: census.lng,
          normalizedAddress: census.normalizedAddress,
          stateFIPS: geo.stateFIPS,
          countyFIPS: geo.countyFIPS,
          tractGEOID: geo.tractGEOID,
          tractName: geo.tractName,
          countyName: geo.countyName,
          stateName: geo.stateName,
          city: census.components.city || '',
          zip: census.components.zip || '',
          source: 'U.S. Census Bureau Geocoder',
          _ts: Date.now()
        };
      }).catch(function () {
        return {
          lat: census.lat,
          lng: census.lng,
          normalizedAddress: census.normalizedAddress,
          stateFIPS: '',
          countyFIPS: '',
          tractGEOID: '',
          tractName: '',
          countyName: '',
          stateName: census.components.state || '',
          city: census.components.city || '',
          zip: census.components.zip || '',
          source: 'U.S. Census Bureau Geocoder (partial)',
          _ts: Date.now()
        };
      });
    }).catch(function () {
      return geocodeNominatim(address).catch(function () {
        return geocodePhoton(address);
      });
    });
  }

  /* ================================================================
     LAYER 2: Census ACS data (works nationwide)
     ================================================================ */

  function fetchCensusACS(stateFIPS, countyFIPS, tractGEOID) {
    if (!stateFIPS || !countyFIPS || !tractGEOID) {
      return Promise.resolve(null);
    }

    var tract = tractGEOID.length === 11 ? tractGEOID.substring(5) : tractGEOID;
    var vars = 'NAME,B25077_001E,B25035_001E,B25064_001E,B25003_002E,B25003_001E,B25010_001E,B25002_001E,B19013_001E,B17021_002E,B15003_022E';

    function tryFetch(useKey) {
      var keyParam = useKey ? '&key=' + CENSUS_KEY : '';
      var url = 'https://api.census.gov/data/2022/acs/acs5?get=' + vars +
        '&for=tract:' + encodeURIComponent(tract) +
        '&in=state:' + encodeURIComponent(stateFIPS) +
        '&in=county:' + encodeURIComponent(countyFIPS) + keyParam;

      return fetchJSON(url);
    }

    return tryFetch(true).catch(function () {
      return tryFetch(false);
    }).then(function (data) {
      if (!data || data.length < 2) throw new Error('No ACS data rows');
      var row = data[1];
      var totalOccupied = parseFloat(row[5]) || 1;
      var ownerOccupied = parseFloat(row[4]) || 0;
      var ownerPct = totalOccupied > 0 ? Math.round(ownerOccupied / totalOccupied * 100) : 0;

      return {
        tractName: row[0] || '',
        medianValue: parseFloat(row[1]) || 0,
        medianYearBuilt: parseFloat(row[2]) || 0,
        medianRent: parseFloat(row[3]) || 0,
        ownerPct: ownerPct,
        avgHHSize: parseFloat(row[6]) || 0,
        totalHousingUnits: parseFloat(row[7]) || 0,
        medianIncome: parseFloat(row[8]) || 0,
        popBelowPoverty: parseFloat(row[9]) || 0,
        bachelors: parseFloat(row[10]) || 0,
        source: 'U.S. Census Bureau - ACS 2022 5-Year',
        _ts: Date.now()
      };
    }).catch(function () {
      return null;
    });
  }

  /* ================================================================
     LAYER 3: County Assessor / ArcGIS (attempt, fall back gracefully)
     ================================================================ */

  function extractStreet(address) {
    var commaIdx = address.indexOf(',');
    var streetPart = commaIdx > 0 ? address.substring(0, commaIdx).trim() : address.trim();
    streetPart = streetPart.replace(/^\d+\s*/, '');
    if (!streetPart) streetPart = address.trim();
    return streetPart;
  }

  function fetchKingCoParcel(street) {
    var url = 'https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/2/query' +
      '?where=ADDR_FULL+like+\'%25' + encodeURIComponent(street) + '%25\'' +
      '&outFields=*&returnGeometry=false&f=json';

    return fetchJSON(url).then(function (data) {
      if (!data.features || !data.features.length) throw new Error('No parcel match');
      var attrs = data.features[0].attributes;
      if (!attrs) throw new Error('No parcel attributes');

      return {
        landValue: attrs.APPRLNDVAL || 0,
        improvementValue: attrs.APPR_IMPR || 0,
        totalValue: (attrs.APPRLNDVAL || 0) + (attrs.APPR_IMPR || 0),
        lotSqft: attrs.LOTSQFT || 0,
        zoning: attrs.KCA_ZONING || '',
        landUse: attrs.PREUSE_DESC || '',
        source: 'King County Assessor',
        _ts: Date.now()
      };
    }).catch(function () {
      return null;
    });
  }

  function fetchKingCoSales(street) {
    var url = 'https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_PropertyInfo/MapServer/3/query' +
      '?where=ADDRESS+like+\'%25' + encodeURIComponent(street) + '%25\'' +
      '&outFields=*&returnGeometry=false&orderByFields=SaleDate+DESC' +
      '&resultRecordCount=5&f=json';

    return fetchJSON(url).then(function (data) {
      if (!data.features || !data.features.length) throw new Error('No sales records');

      return data.features.map(function (f) {
        var a = f.attributes;
        var d = a.SaleDate ? new Date(a.SaleDate) : null;
        return {
          date: d ? fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()) : 'Unknown',
          price: a.SalePrice || 0,
          seller: a.Sellername || 'Unknown',
          buyer: a.buyername || 'Unknown',
          rawDate: a.SaleDate
        };
      });
    }).catch(function () {
      return null;
    });
  }

  function fetchCountyParcel(geo, street) {
    var arcgisInfo = ARCGIS_COUNTY_MAP[getFipsKey(geo)];

    if (arcgisInfo && arcgisInfo.hasParcelData) {
      return fetchKingCoParcel(street);
    }

    return Promise.resolve(null);
  }

  function fetchCountySales(geo, street) {
    var arcgisInfo = ARCGIS_COUNTY_MAP[getFipsKey(geo)];

    if (arcgisInfo && arcgisInfo.hasParcelData) {
      return fetchKingCoSales(street);
    }

    return Promise.resolve(null);
  }

  /* ================================================================
     LAYER 4: Overpass API (building footprint / floors / type)
     ================================================================ */

  function overpassQuery(q) {
    return fetchJSON('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(q)
    });
  }

  function fetchOverpassBuilding(lat, lng) {
    var query = '[out:json][timeout:15];\n' +
      'way(around:100,' + lat + ',' + lng + ')[building][addr:housenumber];\n' +
      'out geom 1;';

    return overpassQuery(query).then(function (data) {
      if (!data.elements || !data.elements.length) throw new Error('No building found');

      var tags = data.elements[0].tags || {};
      var levels = parseInt(tags['building:levels'], 10) || 0;
      var heightVal = parseFloat(tags.height) || 0;
      var floors = levels || Math.round(heightVal / 3) || 0;

      var bt = (tags.building || '').toLowerCase();
      var buildingType = 'Building';
      if (bt === 'house' || bt === 'detached' || bt === 'semidetached_house' || bt === 'bungalow') {
        buildingType = 'Single Family Home';
      } else if (bt === 'apartments' || bt === 'apartment') {
        buildingType = 'Apartment Building';
      } else if (bt === 'residential') {
        buildingType = 'Residential Building';
      } else if (bt === 'condominium' || bt === 'condo') {
        buildingType = 'Condominium';
      } else if (bt === 'townhouse') {
        buildingType = 'Townhouse';
      } else if (bt === 'commercial') {
        buildingType = 'Commercial Building';
      } else if (bt === 'office') {
        buildingType = 'Office Building';
      } else if (bt === 'industrial') {
        buildingType = 'Industrial Building';
      } else if (bt === 'garage' || bt === 'garages') {
        buildingType = 'Garage';
      } else if (bt === 'shed') {
        buildingType = 'Shed';
      }

      return {
        buildingType: buildingType,
        floors: floors,
        height: heightVal,
        roofShape: tags['roof:shape'] || '',
        buildingTag: tags.building || 'yes',
        buildingMaterial: tags['building:material'] || '',
        buildingColor: tags['building:color'] || '',
        source: 'OpenStreetMap contributors',
        _ts: Date.now()
      };
    }).catch(function () {
      return null;
    });
  }

  /* ---- Overpass: nearby schools ---- */
  function fetchOverpassNearbySchools(lat, lng) {
    var query = '[out:json][timeout:15];\n' +
      'node(around:2000,' + lat + ',' + lng + ')[amenity=school];\n' +
      'out 3;';

    return overpassQuery(query).then(function (data) {
      if (!data.elements || !data.elements.length) return [];
      return data.elements.map(function (el) {
        var t = el.tags || {};
        return {
          name: t.name || t['name:en'] || 'Unnamed School',
          operator: t.operator || '',
          grades: t['school:grades'] || '',
          type: t['school:type'] || ''
        };
      });
    }).catch(function () {
      return [];
    });
  }

  /* ================================================================
     LAYER 5: NWS Weather
     ================================================================ */

  function fetchWeather(lat, lng) {
    var headers = { 'User-Agent': NWS_UA };

    return fetchJSON('https://api.weather.gov/points/' + lat + ',' + lng, { headers: headers })
      .then(function (data) {
        var forecastUrl = data.properties && data.properties.forecast;
        if (!forecastUrl) throw new Error('No forecast URL');
        return fetchJSON(forecastUrl, { headers: headers });
      }).then(function (data) {
        var period = data.properties && data.properties.periods &&
          data.properties.periods && data.properties.periods[0];
        if (!period) throw new Error('No forecast period');

        return {
          forecast: period.shortForecast || '',
          temperature: period.temperature,
          temperatureUnit: period.temperatureUnit || 'F',
          icon: period.icon || '',
          name: period.name || '',
          detailed: period.detailedForecast || '',
          source: 'NOAA / National Weather Service',
          _ts: Date.now()
        };
      }).catch(function () {
        return null;
      });
  }

  /* ---- LAYER 8: FEMA Flood Zone ---- */
  function fetchFloodZone(lat, lng) {
    var url = 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query' +
      '?geometry=' + lng + ',' + lat +
      '&geometryType=esriGeometryPoint' +
      '&inSR=4326&spatialRel=esriSpatialRelIntersects' +
      '&outFields=FLD_ZONE,ZONE_SUBTY,FLOODWAY,SFHA_TF,STATIC_BFE' +
      '&returnGeometry=false&f=json';

    return fetchJSON(url).then(function (d) {
      if (!d.features || !d.features.length) return null;
      var attrs = d.features[0].attributes;
      var zone = attrs.FLD_ZONE || '';
      var inSFHA = attrs.SFHA_TF === 'T' || attrs.SFHA_TF === true;
      var floodway = attrs.FLOODWAY === 'T' || attrs.FLOODWAY === true;

      var riskLevel = 'minimal';
      var riskLabel = 'Minimal Risk';
      var riskColor = 'var(--sage-deep)';

      if (zone && zone.charAt(0) === 'V') {
        riskLevel = 'high'; riskLabel = 'High Risk (Velocity Zone)'; riskColor = 'var(--danger)';
      } else if (zone === 'A' || zone === 'AE' || zone === 'AH' || zone === 'AO') {
        riskLevel = 'high'; riskLabel = 'High Risk (1% Annual Chance)'; riskColor = 'var(--danger)';
      } else if (zone === 'X500' || zone === '0.2PCT' || zone === 'Shaded X') {
        riskLevel = 'moderate'; riskLabel = 'Moderate Risk (0.2% Annual Chance)'; riskColor = 'var(--clay)';
      } else if (zone === 'X' || zone === 'X PROTECTED BY LEVEE') {
        riskLevel = 'minimal'; riskLabel = 'Minimal Risk'; riskColor = 'var(--sage-deep)';
      } else if (zone === 'D') {
        riskLevel = 'unknown'; riskLabel = 'Undetermined Risk (Zone D)'; riskColor = 'var(--muted)';
      }

      return {
        zone: zone,
        subType: attrs.ZONE_SUBTY || '',
        inSFHA: inSFHA,
        floodway: floodway,
        riskLevel: riskLevel,
        riskLabel: riskLabel,
        riskColor: riskColor,
        staticBFE: attrs.STATIC_BFE || null,
        source: 'FEMA National Flood Hazard Layer',
        _ts: Date.now()
      };
    }).catch(function () { return null; });
  }

  /* ---- LAYER 6: FRED Economic Data (via CORS proxy) ---- */
  function fetchFredRates() {
    if (!window.__GK_PROXY || !window.__GK_PROXY.baseUrl) {
      return Promise.resolve(null);
    }

    var proxy = window.__GK_PROXY.baseUrl + '/fred/series/observations';
    var series = [
      { id: 'MORTGAGE30US', label: '30-Year Fixed' },
      { id: 'MORTGAGE15US', label: '15-Year Fixed' },
      { id: 'MSPUS', label: 'Median Sale Price' }
    ];

    var fetches = series.map(function (s) {
      var url = proxy + '?series_id=' + s.id +
        '&file_type=json&sort_order=desc&limit=1';

      return fetchJSON(url)
        .then(function (d) {
          if (!d || !d.observations || !d.observations.length) return null;
          var val = parseFloat(d.observations[0].value);
          return { id: s.id, label: s.label, value: val, date: d.observations[0].date };
        })
        .catch(function () { return null; });
    });

    return Promise.all(fetches).then(function (results) {
      var out = { source: 'Federal Reserve Economic Data (FRED)', _ts: Date.now() };
      for (var i = 0; i < results.length; i++) {
        if (results[i]) out[results[i].id] = results[i];
      }
      return Object.keys(out).length > 2 ? out : null;
    });
  }

  /* ================================================================
     Rendering
     ================================================================ */

  var addressMap = null;

  function scoreColor(score) {
    if (score >= 90) return '#1a9641';
    if (score >= 70) return '#66bd63';
    if (score >= 50) return '#fdae61';
    if (score >= 25) return '#f46d43';
    return '#d73027';
  }

  function renderMap(geo, nearbySchools, flood) {
    if (typeof L === 'undefined') return;
    var mapEl = document.getElementById('address-map');
    if (!mapEl) return;

    if (window.innerWidth < 768) {
      mapEl.style.height = '220px';
    } else {
      mapEl.style.height = '380px';
    }

    var lat = geo.lat, lng = geo.lng;

    if (!addressMap) {
      if (typeof L === 'undefined' || !L.map) return;
      addressMap = L.map('address-map', { zoomControl: true }).setView([lat, lng], 16);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(addressMap);
    } else {
      addressMap.setView([lat, lng], 16, { animate: true, duration: 0.5 });
      addressMap.eachLayer(function (layer) {
        if (!layer._url) addressMap.removeLayer(layer);
      });
    }

    var fullAddr = geo.normalizedAddress || 'Address';
    var shortAddr = fullAddr;
    if (shortAddr.indexOf(',') !== -1) {
      var addrParts = shortAddr.split(',');
      if (addrParts.length > 4) shortAddr = addrParts.slice(0, 4).join(',').trim();
    }
    if (shortAddr.length > 80) shortAddr = shortAddr.substring(0, 77) + '\u2026';
    var addrHtml = '<strong>' + escapeHtml(shortAddr) + '</strong>';

    if (flood && flood.zone) {
      addrHtml += '<br><span style="color:' + flood.riskColor + ';font-weight:600;">Flood Zone: ' + flood.zone + '</span>';
    }
    L.marker([lat, lng]).addTo(addressMap).bindPopup(addrHtml, { maxWidth: 280 }).openPopup();

    // Legend
    var legendEl = document.getElementById('map-legend');
    if (legendEl && flood && flood.zone) {
      legendEl.innerHTML =
        '<div class="map-legend-item"><span class="map-legend-dot" style="background:var(--sage-deep);"></span> Property</div>' +
        '<div class="map-legend-item"><span class="map-legend-dot" style="background:' + flood.riskColor + ';"></span> Flood Zone ' + flood.zone + '</div>';
    } else if (legendEl) {
      legendEl.innerHTML = '';
    }

    setTimeout(function () { if (addressMap) addressMap.invalidateSize(); }, 400);
  }

  function invalidateMap() {
    if (addressMap) {
      setTimeout(function () { if (addressMap) addressMap.invalidateSize(); }, 400);
    }
  }

  /* ---- 1. Property Overview ---- */
  function renderOverview(geo, building, parcel) {
    var statsEl = document.getElementById('overview-stats');
    var detailsEl = document.getElementById('overview-details');

    var addrDisplay = geo.normalizedAddress || '';
    var bType = building ? building.buildingType : '';
    var floors = building && building.floors > 0 ? building.floors : '';
    var lotSqft = parcel && parcel.lotSqft ? parcel.lotSqft : '';
    var zoning = parcel && parcel.zoning ? parcel.zoning : '';
    var abbr = getStateAbbr(geo);

    var html = '<div class="stat-pair"><span class="stat-label">Address</span>' +
      '<span class="stat-value">' + escapeHtml(addrDisplay) + '</span></div>';

    if (geo.stateName) {
      html += '<div class="stat-pair"><span class="stat-label">State</span>' +
        '<span class="stat-value">' + escapeHtml(geo.stateName) +
        (abbr ? ' <span style="color:var(--muted);">(' + abbr + ')</span>' : '') +
        '</span></div>';
    }

    if (geo.countyName) {
      html += '<div class="stat-pair"><span class="stat-label">County</span>' +
        '<span class="stat-value">' + escapeHtml(geo.countyName) + '</span></div>';
    }

    if (geo.tractGEOID) {
      html += '<div class="stat-pair"><span class="stat-label">Census Tract</span>' +
        '<span class="stat-value" style="font-family:monospace;">' + escapeHtml(geo.tractGEOID) +
        '</span></div>';
    }

    if (bType) {
      html += '<div class="stat-pair"><span class="stat-label">Building Type</span>' +
        '<span class="stat-value"><span class="prop-badge">' + escapeHtml(bType) + '</span>' +
        '</span></div>';
    }

    if (floors) {
      html += '<div class="stat-pair"><span class="stat-label">Floors</span>' +
        '<span class="stat-value">' + floors + ' story' + (floors > 1 ? 's' : '') +
        '</span></div>';
    }

    if (building && building.height && !floors) {
      html += '<div class="stat-pair"><span class="stat-label">Height</span>' +
        '<span class="stat-value">' + building.height + ' m' +
        '</span></div>';
    }

    if (building && building.roofShape) {
      html += '<div class="stat-pair"><span class="stat-label">Roof Style</span>' +
        '<span class="stat-value">' + escapeHtml(building.roofShape) +
        '</span></div>';
    }

    if (building && building.buildingMaterial) {
      html += '<div class="stat-pair"><span class="stat-label">Building Material</span>' +
        '<span class="stat-value">' + escapeHtml(building.buildingMaterial) +
        '</span></div>';
    }

    if (lotSqft) {
      html += '<div class="stat-pair"><span class="stat-label">Lot Size</span>' +
        '<span class="stat-value">' + lotSqft.toLocaleString('en-US') + ' sq ft' +
        '</span></div>';
    }

    if (zoning) {
      html += '<div class="stat-pair"><span class="stat-label">Zoning</span>' +
        '<span class="stat-value">' + escapeHtml(zoning) +
        '</span></div>';
    }

    if (!bType && !lotSqft && !zoning) {
      html += '<div class="stat-pair"><span class="stat-label">Data Available</span>' +
        '<span class="stat-value" style="color:var(--muted);">Geocoding + public records</span></div>';
    }

    statsEl.innerHTML = '';
    detailsEl.innerHTML = html;
  }

  /* ---- 2. Tax & Assessment ---- */
  function renderTax(geo, parcel, census) {
    var statsEl = document.getElementById('tax-stats');
    var detailsEl = document.getElementById('tax-details');
    var countyName = geo.countyName || 'this county';
    var stateName = geo.stateName || 'this state';
    var abbr = getStateAbbr(geo);
    var assessorUrl = getCountyAssessorUrl(geo);

    if (parcel && isKingCounty(geo)) {
      var landVal = parcel.landValue || 0;
      var imprVal = parcel.improvementValue || 0;
      var totalVal = landVal + imprVal;

      statsEl.innerHTML =
        '<div class="stat-pair"><span class="stat-label">Total Assessed Value</span>' +
        '<span class="stat-value">' + money(totalVal) + '</span></div>' +
        '<div class="stat-pair"><span class="stat-label">Appraised Land Value</span>' +
        '<span class="stat-value">' + money(landVal) + '</span></div>' +
        '<div class="stat-pair"><span class="stat-label">Appraised Improvement Value</span>' +
        '<span class="stat-value">' + money(imprVal) + '</span></div>';

      detailsEl.innerHTML =
        '<div class="data-grid">' +
        '<div class="stat-pair"><span class="stat-label">Land Use</span>' +
        '<span class="stat-value">' + escapeHtml(parcel.landUse || '\u2014') + '</span></div>' +
        '<div class="stat-pair"><span class="stat-label">Zoning</span>' +
        '<span class="stat-value">' + escapeHtml(parcel.zoning || '\u2014') + '</span></div>' +
        '<div class="stat-pair"><span class="stat-label">Lot Size</span>' +
        '<span class="stat-value">' + (parcel.lotSqft ? parcel.lotSqft.toLocaleString('en-US') + ' sq ft' : '\u2014') + '</span></div>' +
        '</div>';
    } else {
      statsEl.innerHTML = '';

      var ctxHtml = '';
      if (census && census.medianValue > 0) {
        ctxHtml = '<div class="stat-pair"><span class="stat-label">Census Tract Median Home Value</span>' +
          '<span class="stat-value">' + money(census.medianValue) + '</span></div>';
      }

      detailsEl.innerHTML =
        '<div style="padding:14px;background:var(--sage-soft);border-radius:12px;font-size:0.9rem;color:var(--muted);margin-bottom:16px;">' +
        'Parcel-level tax and assessment data is not available for ' + escapeHtml(countyName) + ', ' +
        escapeHtml(stateName) + '. Property tax and assessment records are maintained by the ' +
        escapeHtml(countyName) + ' Assessor\'s office.' +
        (assessorUrl ? ' <a href="' + assessorUrl + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">Visit the ' + escapeHtml(countyName) + ' Assessor</a>' : '') +
        '</div>' + ctxHtml;
    }

    detailsEl.innerHTML +=
      '<div class="disclaimer" style="margin-top:18px;">' +
      '<p>Data sourced from public records and government APIs. Not for legal, financial, or insurance decisions. ' +
      'Verify with official county records.</p></div>';
  }

  /* ---- 3. Sale History ---- */
  function renderSales(geo, sales) {
    var el = document.getElementById('sales-details');
    var countyName = geo.countyName || 'this county';
    var stateName = geo.stateName || 'this state';
    var isKingCo = isKingCounty(geo);

    if (!isKingCo) {
      el.innerHTML =
        '<div style="padding:14px;background:var(--sage-soft);border-radius:12px;font-size:0.9rem;color:var(--muted);">' +
        'Sale history is maintained by the county recorder\'s office. Visit the ' +
        escapeHtml(countyName) + ' Recorder for official records.' +
        '</div>' +
        '<div class="disclaimer" style="margin-top:18px;">' +
        '<p>Data sourced from public records and government APIs. Not for legal, financial, or insurance decisions.</p></div>';
      return;
    }

    if (!sales || !sales.length) {
      el.innerHTML =
        '<div class="stat-pair"><span class="stat-label">Sales Records</span>' +
        '<span class="stat-value" style="color:var(--muted);">No sales found for this address</span></div>' +
        '<div class="disclaimer" style="margin-top:18px;">' +
        '<p>Data sourced from public records and government APIs. Not for legal, financial, or insurance decisions.</p></div>';
      return;
    }

    var html = '<p style="font-size:0.85rem;color:var(--muted);margin:0 0 12px;">' +
      sales.length + ' recent sale' + (sales.length > 1 ? 's' : '') + ' found</p>';

    for (var i = 0; i < sales.length; i++) {
      var s = sales[i];
      html += '<div class="stat-pair"><div><span class="stat-label" style="display:block;">' +
        escapeHtml(s.date) + '</span>' +
        '<span style="font-size:0.82rem;color:var(--muted);">Seller: ' + escapeHtml(s.seller) +
        ' \u2192 Buyer: ' + escapeHtml(s.buyer) + '</span></div>' +
        '<span class="stat-value">' + money(s.price) + '</span></div>';
    }

    el.innerHTML = html;
  }

  /* ---- 4. School Information ---- */
  function renderSchools(geo, nearbySchools) {
    var el = document.getElementById('schools-details');
    var abbr = getStateAbbr(geo);
    var stateName = geo.stateName || '';
    var edUrl = getStateEdUrl(geo);

    var html =
      '<div style="margin-top:16px;">' +
      '<div style="font-size:0.9rem;color:var(--muted);">' +
      'School district information for this address can be found through the ' +
      'National Center for Education Statistics (NCES) or your state\'s education department.</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;">' +
      '<a href="https://nces.ed.gov/ccd/schoolsearch/" target="_blank" rel="noopener" class="resource-card" ' +
      'style="display:inline-flex;">' +
      '<span class="resource-icon" style="font-size:1.1rem;">&#x1F3EB;</span>' +
      '<span class="resource-title">NCES School Search</span></a>';

    if (edUrl) {
      html += '<a href="' + edUrl + '" target="_blank" rel="noopener" class="resource-card" ' +
        'style="display:inline-flex;">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F3EB;</span>' +
        '<span class="resource-title">' + escapeHtml(stateName) + ' Dept. of Education</span></a>';
    }

    html += '</div></div>';

    if (nearbySchools && nearbySchools.length > 0) {
      html += '<div style="margin-top:18px;">' +
        '<p style="font-size:0.85rem;color:var(--muted);margin:0 0 10px;">' +
        'Nearby schools from OpenStreetMap</p>';

      for (var i = 0; i < nearbySchools.length; i++) {
        var s = nearbySchools[i];
        html += '<div class="stat-pair"><span class="stat-label">' + escapeHtml(s.name) + '</span>' +
          '<span class="stat-value" style="font-size:0.82rem;color:var(--muted);">' +
          (s.type ? escapeHtml(s.type) + ' ' : '') +
          (s.grades ? 'Grades ' + escapeHtml(s.grades) : '') +
          '</span></div>';
      }
      html += '</div>';
    }

    html += '<div class="disclaimer" style="margin-top:18px;">' +
      '<p>School district assignments are estimated based on location. ' +
      'Always verify boundaries and enrollment with the school district directly.</p></div>';

    el.innerHTML = html;
  }

  /* ---- 5. Neighborhood Insights ---- */
  function renderNeighborhood(census, weather, fred, geo) {
    var el = document.getElementById('neighborhood-details');
    var html = '';

    if (fred) {
      html += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px;">';
      if (fred.MORTGAGE30US && fred.MORTGAGE30US.value) {
        html += '<div style="flex:1;min-width:160px;background:var(--sage-soft);border-radius:10px;padding:14px;">' +
          '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">30-Year Fixed Rate</div>' +
          '<div style="font-size:1.5rem;font-weight:700;color:var(--sage-deep);">' + fred.MORTGAGE30US.value.toFixed(2) + '%</div>' +
          '</div>';
      }
      if (fred.MORTGAGE15US && fred.MORTGAGE15US.value) {
        html += '<div style="flex:1;min-width:160px;background:var(--clay-soft);border-radius:10px;padding:14px;">' +
          '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">15-Year Fixed Rate</div>' +
          '<div style="font-size:1.5rem;font-weight:700;color:var(--clay);">' + fred.MORTGAGE15US.value.toFixed(2) + '%</div>' +
          '</div>';
      }
      if (fred.MSPUS && fred.MSPUS.value) {
        html += '<div style="flex:1;min-width:160px;background:var(--gold-soft);border-radius:10px;padding:14px;">' +
          '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">U.S. Median Sale Price</div>' +
          '<div style="font-size:1.5rem;font-weight:700;color:#a5792e;">' + money(fred.MSPUS.value * 1000) + '</div>' +
          '</div>';
      }
      html += '</div>';
      html += '<p style="font-size:0.75rem;color:var(--muted);margin:0 0 14px;">Federal Reserve Economic Data — latest available</p>';
    }

    if (census) {

      if (census.medianValue > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Median Home Value (tract)</span>' +
          '<span class="stat-value">' + money(census.medianValue) + '</span></div>';
      }

      if (census.medianYearBuilt > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Median Year Built (tract)</span>' +
          '<span class="stat-value">' + Math.round(census.medianYearBuilt) + '</span></div>';
      }

      if (census.medianRent > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Median Gross Rent</span>' +
          '<span class="stat-value">' + money(census.medianRent) + '/mo</span></div>';
      }

      html += '<div class="stat-pair"><span class="stat-label">Owner-Occupied</span>' +
        '<span class="stat-value">' + (census.ownerPct || 0) + '%</span></div>';

      if (census.avgHHSize > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Avg. Household Size</span>' +
          '<span class="stat-value">' + census.avgHHSize.toFixed(1) + ' persons</span></div>';
      }

      if (census.totalHousingUnits > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Total Housing Units (tract)</span>' +
          '<span class="stat-value">' + census.totalHousingUnits.toLocaleString('en-US') + '</span></div>';
      }

      if (census.medianIncome > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Median Household Income</span>' +
          '<span class="stat-value">' + money(census.medianIncome) + '</span></div>';
      }

      if (census.popBelowPoverty > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Pop. Below Poverty Line</span>' +
          '<span class="stat-value">' + census.popBelowPoverty.toLocaleString('en-US') + '</span></div>';
      }

      if (census.bachelors > 0) {
        html += '<div class="stat-pair"><span class="stat-label">Population with Bachelor\'s+</span>' +
          '<span class="stat-value">' + census.bachelors.toLocaleString('en-US') + '</span></div>';
      }

      if (census.tractName) {
        html += '<div class="stat-pair"><span class="stat-label">Census Tract</span>' +
          '<span class="stat-value" style="font-size:0.85rem;">' + escapeHtml(census.tractName) + '</span></div>';
      }

      if (geo.tractGEOID) {
        html += '<div class="stat-pair"><span class="stat-label">Tract GEOID</span>' +
          '<span class="stat-value" style="font-family:monospace;font-size:0.82rem;">' +
          escapeHtml(geo.tractGEOID) + '</span></div>';
      }
    }

    if (weather) {
      html += '<div style="margin-top:18px;padding:14px 16px;background:var(--gold-soft);' +
        'border-radius:12px;display:flex;align-items:center;gap:14px;">';
      if (weather.icon) {
        html += '<img src="' + weather.icon + '" alt="" style="width:48px;height:48px;" />';
      }
      html += '<div><div style="font-weight:600;font-size:0.95rem;">' +
        escapeHtml(weather.name) + ': ' + escapeHtml(weather.forecast) + '</div>';
      if (weather.temperature != null) {
        html += '<div style="font-size:0.85rem;color:var(--muted);">' +
          weather.temperature + '\u00B0' + escapeHtml(weather.temperatureUnit) + '</div>';
      }
      html += '</div></div>';
    }

    if (!census && !weather) {
      html += '<div class="stat-pair"><span class="stat-label">Neighborhood Data</span>' +
        '<span class="stat-value" style="color:var(--muted);">Unavailable for this location</span></div>';
    }

    html += '<p style="font-size:0.75rem;color:var(--muted);margin-top:14px;">ACS estimates from Census tract. ' +
      'Flood info: <a href="https://msc.fema.gov/" target="_blank" rel="noopener">FEMA flood maps</a>.</p>';

    el.innerHTML = html;
  }

  /* ---- 6. Additional Resources ---- */
  function renderResources(geo, parcel) {
    var el = document.getElementById('resources-details');
    var addrEncoded = encodeURIComponent(geo.normalizedAddress || '');
    var lat = geo.lat;
    var lng = geo.lng;
    var countyName = geo.countyName || '';
    var stateName = geo.stateName || '';
    var assessorUrl = getCountyAssessorUrl(geo);
    var abbr = getStateAbbr(geo);
    var countyClean = countyName.replace(/ county$/i, '').replace(/\s+/g, '-');

    var html = '<div class="resource-grid">';

    if (assessorUrl) {
      html += '<a href="' + assessorUrl + '" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F3DB;</span>' +
        '<span class="resource-title">' + escapeHtml(countyName) + ' Assessor</span></a>';
    } else if (countyName) {
      html += '<a href="https://www.google.com/search?q=' +
        encodeURIComponent(countyName + ' county assessor property search') +
        '" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F3DB;</span>' +
        '<span class="resource-title">Find ' + escapeHtml(countyName) + ' Assessor</span></a>';
    }

    if (addrEncoded) {
      html += '<a href="https://www.zillow.com/homes/' + addrEncoded + '_rb/" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F3E1;</span>' +
        '<span class="resource-title">View on Zillow</span></a>';
      html += '<a href="https://www.redfin.com/address/' + addrEncoded + '" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F4CB;</span>' +
        '<span class="resource-title">View on Redfin</span></a>';
    }

    html += '<a href="https://msc.fema.gov/portal/search?AddressQuery=' + addrEncoded +
      '" target="_blank" rel="noopener" class="resource-card">' +
      '<span class="resource-icon" style="font-size:1.1rem;">&#x1F30A;</span>' +
      '<span class="resource-title">FEMA Flood Map</span></a>';

    if (lat && lng) {
      var usgsUrl = 'https://ngmdb.usgs.gov/topoview/viewer/#15/' + lat + '/' + lng;
      html += '<a href="' + usgsUrl + '" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F5FA;</span>' +
        '<span class="resource-title">USGS Topo Map</span></a>';
    }

    if (countyClean && stateName) {
      var quickFactsUrl = 'https://www.census.gov/quickfacts/fact/table/' +
        encodeURIComponent(countyName.replace(/\s+/g, '') + stateName.replace(/\s+/g, ''));
      html += '<a href="' + quickFactsUrl + '" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F4CA;</span>' +
        '<span class="resource-title">Census QuickFacts: ' + escapeHtml(countyName) + '</span></a>';
    }

    if (geo.tractGEOID) {
      var tractUrl = 'https://data.census.gov/cedsci/table?g=' +
        encodeURIComponent(geo.tractGEOID.substring(0, 2) + geo.tractGEOID.substring(2, 5) + geo.tractGEOID.substring(5)) +
        '&tid=ACSDP5Y2022.DP04';
      html += '<a href="' + tractUrl + '" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F4CA;</span>' +
        '<span class="resource-title">Census Tract Data Explorer</span></a>';
    }

    if (isKingCounty(geo)) {
      html += '<a href="https://gismaps.kingcounty.gov/" target="_blank" rel="noopener" class="resource-card">' +
        '<span class="resource-icon" style="font-size:1.1rem;">&#x1F30D;</span>' +
        '<span class="resource-title">King County GIS Maps</span></a>';
    }

    html += '</div>' +
      '<div class="disclaimer" style="margin-top:18px;">' +
      '<p>Data sourced from public records and government APIs. Not for legal, financial, or insurance decisions. ' +
      'External links are provided for convenience. getkeyd is not affiliated with any government agency or real estate company.</p></div>';

    el.innerHTML = html;
  }

  /* ================================================================
     Sources summary & metadata
     ================================================================ */

  function updateSourcesLine(geo, census, parcel, building, weather, flood, walkScore) {
    if (!sourcesFooter) return;
    var sources = [];
    if (census) sources.push('U.S. Census Bureau');
    if (parcel) sources.push((geo.countyName || '') + ' County Assessor');
    if (building) sources.push('OpenStreetMap');
    if (weather) sources.push('NOAA / NWS');
    if (flood) sources.push('FEMA');
    if (walkScore) sources.push('Walk Score');
    if (!sources.length) { sourcesFooter.classList.add('hidden'); return; }
    sourcesFooter.classList.remove('hidden');
    sourcesFooter.innerHTML = sources.map(function (s) {
      return '<span class="source-chip">' + escapeHtml(s) + '</span>';
    }).join('');
  }

  function updateDataAge(geo) {
    if (!dataAge || !dataTimestamp) return;
    var ts = geo && geo._ts ? geo._ts : Date.now();
    dataAge.classList.remove('hidden');
    dataTimestamp.textContent = new Date(ts).toLocaleString();
  }

  function updateNonKingNote(geo) {
    if (!nonKingNote) return;
    if (isKingCounty(geo)) {
      nonKingNote.classList.add('hidden');
    } else {
      nonKingNote.classList.remove('hidden');
    }
  }

  /* ================================================================
     UI State Management
     ================================================================ */

  function showLoading() {
    form.classList.add('loading');
    submitBtn.disabled = true;
    submitBtn.classList.remove('success-pulse');
    errorEl.classList.add('hidden');
    results.classList.add('hidden');
    if (heroSection) heroSection.dataset.resultsActive = 'false';
    if (sourcesFooter) sourcesFooter.classList.add('hidden');
    if (dataDisclaimer) dataDisclaimer.classList.add('hidden');
    if (dataAge) dataAge.classList.add('hidden');
    if (nonKingNote) nonKingNote.classList.add('hidden');
    if (hashLoading) hashLoading.classList.add('hidden');

    // Hide hero text + stats, show loader where form was
    if (heroEyebrow) heroEyebrow.classList.add('hidden');
    if (heroTitle) heroTitle.classList.add('hidden');
    if (heroSubtitle) heroSubtitle.classList.add('hidden');
    if (heroStats) heroStats.classList.add('hidden');
    if (heroLoader) heroLoader.classList.remove('hidden');
    if (gkLoaderText) gkLoaderText.textContent = 'Loading';

    // Full-page overlay — no scrolling, covers vine designs
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    document.body.classList.add('no-scroll');

    startProgress();
    if (heroSection) heroSection.classList.remove('shrink');
  }

  function hideLoading() {
    form.classList.remove('loading');
    submitBtn.disabled = false;
    if (heroLoader) heroLoader.classList.add('hidden');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    document.body.classList.remove('no-scroll');
    completeProgress();
  }

  function showError(msg) {
    hideLoading();
    resetProgress();
    // Show hero text + form again
    if (heroEyebrow) heroEyebrow.classList.remove('hidden');
    if (heroTitle) heroTitle.classList.remove('hidden');
    if (heroSubtitle) heroSubtitle.classList.add('hidden');
    if (heroStats) heroStats.classList.remove('hidden');

    errorMsg.textContent = msg;
    errorEl.classList.remove('hidden');
    results.classList.add('hidden');

    if (heroSection) heroSection.classList.remove('shrink');

    if (inputGroup) {
      inputGroup.classList.add('shake');
      setTimeout(function () { inputGroup.classList.remove('shake'); }, 500);
    }

    if (stickySearch) stickySearch.classList.remove('visible');
    if (resultsToast) resultsToast.classList.remove('show');
  }

  function revealResults() {
    hideLoading();
    errorEl.classList.add('hidden');
    if (results.classList.contains('hidden')) results.classList.remove('hidden');
    if (heroSection) heroSection.dataset.resultsActive = 'true';
    if (dataDisclaimer) dataDisclaimer.classList.remove('hidden');

    if (heroSection) heroSection.classList.add('shrink');

    var sections = results.querySelectorAll('.result-section');
    for (var j = 0; j < sections.length; j++) {
      sections[j].classList.remove('reveal');
      sections[j].style.animation = 'none';
      void sections[j].offsetWidth;
      sections[j].style.animation = '';
    }

    requestAnimationFrame(function () {
      for (var i = 0; i < sections.length; i++) {
        (function (el, idx) {
          el.style.animationDelay = (idx * 0.07) + 's';
          el.classList.add('reveal');
        })(sections[i], i);
      }
    });

    setTimeout(function () {
      var first = results.querySelector('.result-section');
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);

    submitBtn.classList.add('success-pulse');
    setTimeout(function () {
      submitBtn.classList.remove('success-pulse');
    }, 700);

    if (stickySearch) stickySearch.classList.add('visible');
    invalidateMap();
  }

  /* ================================================================
     Main Search Flow
     ================================================================ */

  function searchAddress(raw) {
    var q = raw.trim();
    if (!q) return;
    showLoading();

    var cached = getCache(q);
    if (cached && cached.geo) {
      renderAll(cached);
      try { location.hash = encodeURIComponent(q); } catch (e) {}
      revealResults();
      return;
    }

    geocodeAddress(q).then(function (geo) {
      var street = extractStreet(q);
      var hasFIPS = !!(geo.stateFIPS && geo.countyFIPS && geo.tractGEOID);

      var promises = {};

      if (hasFIPS) {
        promises.census = fetchCensusACS(geo.stateFIPS, geo.countyFIPS, geo.tractGEOID);
      } else {
        promises.census = Promise.resolve(null);
      }

      promises.parcel = fetchCountyParcel(geo, street);
      promises.sales = fetchCountySales(geo, street);
      promises.building = fetchOverpassBuilding(geo.lat, geo.lng);
      promises.weather = fetchWeather(geo.lat, geo.lng);
      promises.nearbySchools = fetchOverpassNearbySchools(geo.lat, geo.lng);
      promises.fred = fetchFredRates();
      promises.flood = fetchFloodZone(geo.lat, geo.lng);

      var allPromises = [
        promises.census,
        promises.parcel,
        promises.sales,
        promises.building,
        promises.weather,
        promises.nearbySchools,
        promises.fred,
        promises.flood
      ];

      return Promise.all(allPromises).then(function (results) {
        var resultData = {
          geo: geo,
          census: results[0],
          parcel: results[1],
          sales: results[2],
          building: results[3],
          weather: results[4],
          nearbySchools: results[5],
          fred: results[6],
          flood: results[7],
          _ts: Date.now()
        };

        setCache(q, resultData);
        renderAll(resultData);

        try { location.hash = encodeURIComponent(q); } catch (e) {}
        revealResults();
      });
    }).catch(function (err) {
      hideLoading();
      resetProgress();

      if (err && err.message && err.message.indexOf('No address match') !== -1) {
        showError('Address not found. Please check the spelling or try a different address.');
        return;
      }
      if (err && err.message && err.message.indexOf('No Nominatim results') !== -1) {
        showError('Address not found. Please check the spelling or try a different address.');
        return;
      }
      if (err && err.message && err.message.indexOf('No Photon results') !== -1) {
        showError('Address not found. Please check the spelling or try a more specific address.');
        return;
      }
      if (err && err.name === 'AbortError') {
        showError('The search is taking too long. Please try again.');
        return;
      }
      if (err && (err.name === 'TypeError' || (err.message && err.message.indexOf('fetch') !== -1))) {
        showError('Unable to connect. Please check your internet and try again.');
        return;
      }

      showError('Something went wrong searching for that address. Please try again.');
    });
  }

  function renderAll(data) {
    var geo = data.geo || {};

    renderOverview(geo, data.building, data.parcel);
    renderTax(geo, data.parcel, data.census);
    renderSales(geo, data.sales);
    renderSchools(geo, data.nearbySchools);
    renderMap(geo, data.nearbySchools, data.flood);
    renderNeighborhood(data.census, data.weather, data.fred, geo, data.walkScore, data.flood);
    renderResources(geo, data.parcel);

    updateSourcesLine(geo, data.census, data.parcel, data.building, data.weather, data.flood, data.walkScore);
    updateDataAge(geo);
    updateNonKingNote(geo);
  }

  /* ================================================================
     Event Binding
     ================================================================ */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input) return;
    var q = input.value.trim();
    if (!q) {
      showError('Please enter an address to search.');
      if (inputGroup) {
        inputGroup.classList.add('shake');
        setTimeout(function () { inputGroup.classList.remove('shake'); }, 500);
      }
      input.focus();
      return;
    }
    stopPlaceholderCycle();
    searchAddress(q);
  });

  /* Pause placeholder cycling while focused */
  if (input) {
    input.addEventListener('focus', stopPlaceholderCycle);
    input.addEventListener('blur', function () {
      if (!input.value.trim()) startPlaceholderCycle();
    });
  }

  /* Copy link button */
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', function () {
      if (!input) return;
      var url = location.href.split('#')[0];
      var q = input.value.trim();
      if (q) url += '#' + encodeURIComponent(q);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          showToast('Link copied!');
        }).catch(function () {
          fallbackCopy(url);
        });
      } else {
        fallbackCopy(url);
      }
    });
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Link copied!'); } catch (e) { showToast('Could not copy — ' + text); }
    document.body.removeChild(ta);
  }

  /* Print button */
  if (printResultsBtn) {
    printResultsBtn.addEventListener('click', function () {
      window.print();
    });
  }

  /* Error retry button */
  if (errorRetry) {
    errorRetry.addEventListener('click', function () {
      if (!input) return;
      errorEl.classList.add('hidden');
      if (input.value.trim()) {
        searchAddress(input.value.trim());
      }
      input.focus();
    });
  }

  /* Sticky search CTA */
  var stickyCta = document.querySelector('.sticky-search-cta');
  if (stickyCta) {
    stickyCta.addEventListener('click', function () {
      if (!input || !heroSection) return;
      heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { input.focus(); }, 500);
    });
  }

  /* ── IntersectionObserver: show sticky search when hero scrolls out ── */
  if (heroSection && stickySearch && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      if (results.classList.contains('hidden')) return;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          stickySearch.classList.remove('visible');
        } else {
          stickySearch.classList.add('visible');
        }
      }
    }, { rootMargin: '-80px 0px 0px 0px' });
    obs.observe(heroSection);
  }

  /* ---- URL hash: auto-search on load and hashchange ---- */
  function hashLookup() {
    if (!input) return;
    try {
      var h = location.hash.slice(1);
      if (h) {
        var q = decodeURIComponent(h).trim();
        if (q) {
          input.value = q;
          if (hashLoading) {
            hashLoading.classList.remove('hidden');
            setTimeout(function () {
              if (hashLoading) hashLoading.classList.add('hidden');
            }, 2000);
          }
          searchAddress(q);
        }
      }
    } catch (_) { /* malformed hash, ignore */ }
  }

  window.addEventListener('hashchange', function () {
    if (!input) return;
    try {
      var h = location.hash.slice(1);
      if (h) {
        var q = decodeURIComponent(h).trim();
        if (q && q !== input.value.trim()) {
          input.value = q;
          searchAddress(q);
        }
      }
    } catch (_) { /* malformed hash, ignore */ }
  });

  if (location.hash) hashLookup();

})();
