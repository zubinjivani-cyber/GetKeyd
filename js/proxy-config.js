// CORS proxy configuration for getkeyd Property Lookup
// Enables access to non-CORS government APIs nationwide.
// API keys are injected server-side by proxy.js (set via environment variables).
window.__GK_PROXY = {
  // Dev-only: the proxy runs on localhost. On the live site this is '' and the
  // FRED layer in address-lookup.js skips itself (no mixed-content fetches).
  baseUrl: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/proxy' : '',

  // Get free API keys:
  // HUD: https://www.huduser.gov/portal/dataset/fmr-api.html  → set HUD_TOKEN env var
  // FRED: https://fred.stlouisfed.org/docs/api/api_key.html   → set FRED_API_KEY env var
  // FBI: https://api.data.gov/signup/                         → set FBI_API_KEY env var
  // Census: https://api.census.gov/data/key_signup.html

  // Proxy endpoints (empty string = disabled)
  endpoints: {
    hud: '/hud',   // Fair Market Rents, Income Limits
    fred: '/fred', // Mortgage rates, housing indices
    fbi: '/fbi',   // Crime statistics by agency
  }
};

// Google Places enrichment (OPTIONAL, off by default): deploy worker/places-worker.js
// to Cloudflare Workers with a GOOGLE_PLACES_KEY binding, then set the endpoint here.
// The pros page merges Google results into search results when this is configured.
// NOTE: add the worker's host to the connect-src CSP on pages/pros.html when enabled.
window.__GK_GOOGLE = { enabled: false, endpoint: '' };
