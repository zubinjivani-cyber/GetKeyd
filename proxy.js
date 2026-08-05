/*
 * getkeyd CORS Proxy — self-contained, zero dependencies, Node.js built-ins only.
 *
 * API keys (free — registration required):
 *   HUD  → https://www.huduser.gov/portal/dataset/fmr-api.html
 *   FRED → https://fred.stlouisfed.org/docs/api/api_key.html
 *   FBI  → https://api.data.gov/signup/
 *
 * Usage:
 *   node proxy.js
 *   # then: npm run start  (starts both proxy + dev server)
 *
 * Environment variables (optional):
 *   PROXY_PORT=3001         port to listen on
 *   PROXY_CORS=*            allowed origin (use "https://getkeyd.app" in production)
 *   FRED_API_KEY=           Federal Reserve Economic Data API key
 *   HUD_TOKEN=              HUD User API token
 *   FBI_API_KEY=            FBI Crime Data API key
 */

const http = require('http');
const https = require('https');

const PORT = process.env.PROXY_PORT || 3001;
// Fail closed: never start as an open relay. PROXY_CORS must be set to the
// exact production origin (e.g. https://getkeyd.app).
const ALLOWED_ORIGIN = process.env.PROXY_CORS || '';
if (!ALLOWED_ORIGIN) {
  console.error('[proxy] PROXY_CORS env var is required (e.g. PROXY_CORS=https://getkeyd.app). Refusing to start open.');
  process.exit(1);
}
const RATE_WINDOW = 60000;
const RATE_MAX = 60;

const API_KEYS = {
  fred: process.env.FRED_API_KEY || '',
  hud: process.env.HUD_TOKEN || '',
  fbi: process.env.FBI_API_KEY || '',
};

/* ---- Rate limiting (in-memory) ---- */
const rateMap = new Map();

function rateCheck(ip) {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + RATE_WINDOW };
    rateMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_MAX;
}

// Purge stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateMap) {
    if (now > e.reset) rateMap.delete(ip);
  }
}, 120000).unref();

/* ---- Proxy route table ---- */
const ROUTES = [
  { prefix: '/proxy/hud/',  target: 'https://www.huduser.gov/hudapi/public/', name: 'hud' },
  { prefix: '/proxy/epa/',  target: 'https://ejscreen.epa.gov/mapper/',        name: 'epa' },
  { prefix: '/proxy/fred/', target: 'https://api.stlouisfed.org/',             name: 'fred' },
  { prefix: '/proxy/fbi/',  target: 'https://api.usa.gov/crime/fbi/cde/',      name: 'fbi' },
];

function matchRoute(pathname) {
  for (let i = 0; i < ROUTES.length; i++) {
    if (pathname.startsWith(ROUTES[i].prefix)) return ROUTES[i];
  }
  return null;
}

/* ---- Utility ---- */
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  });
  res.end(body);
}

function clientIP(req) {
  // Only the direct peer address is trustworthy: this server listens without a
  // reverse proxy, so X-Forwarded-For is client-controlled and must be ignored.
  return req.socket.remoteAddress || 'unknown';
}

// Headers that should NOT be forwarded from upstream response
const SKIP_RES_HEADERS = new Set([
  'transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'upgrade',
]);

function filterResHeaders(headers) {
  const out = {};
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!SKIP_RES_HEADERS.has(k.toLowerCase())) out[k] = headers[k];
  }
  return out;
}

/* ---- Proxy request ---- */
function proxy(clientReq, clientRes, route) {
  const targetUrl = new URL(route.target);

  const rawUrl = clientReq.url;
  const relative = rawUrl.slice(route.prefix.length);
  const targetBase = targetUrl.pathname.replace(/\/$/, '');
  let upstreamPath = targetBase + '/' + relative;

  // Server-side API key injection — keeps keys out of client code
  if (API_KEYS[route.name]) {
    const sep = upstreamPath.indexOf('?') >= 0 ? '&' : '?';
    const keyParams = { fred: 'api_key', hud: 'token', fbi: 'api_key' };
    upstreamPath += sep + (keyParams[route.name] || 'api_key') + '=' + API_KEYS[route.name];
  }

  const reqHeaders = {};
  const forward = ['content-type', 'accept', 'accept-language',
    'accept-encoding', 'user-agent', 'x-requested-with'];
  for (let i = 0; i < forward.length; i++) {
    const h = forward[i];
    if (clientReq.headers[h]) reqHeaders[h] = clientReq.headers[h];
  }

  const upstreamReq = https.request(
    {
      method: clientReq.method,
      hostname: targetUrl.hostname,
      path: upstreamPath,
      headers: reqHeaders,
      rejectUnauthorized: true,
    },
    (upstreamRes) => {
      const headers = filterResHeaders(upstreamRes.headers);
      headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
      clientRes.writeHead(upstreamRes.statusCode, headers);
      // Cap the response so a misbehaving upstream can't exhaust memory.
      let bytes = 0;
      const MAX_BYTES = 2 * 1024 * 1024;
      upstreamRes.on('data', (c) => {
        bytes += c.length;
        if (bytes > MAX_BYTES) {
          upstreamRes.destroy();
          if (!clientRes.destroyed) clientRes.destroy();
        }
      });
      upstreamRes.pipe(clientRes);
    }
  );

  upstreamReq.on('error', (err) => {
    console.error(`[proxy] upstream error (${route.name}):`, err.message);
    if (!clientRes.headersSent) {
      json(clientRes, 502, { error: 'Upstream API unreachable', details: err.message });
    }
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy();
    if (!clientRes.headersSent) {
      json(clientRes, 504, { error: 'Upstream API timed out' });
    }
  });

  upstreamReq.setTimeout(30000);
  clientReq.pipe(upstreamReq);
}

/* ---- Server ---- */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const route = matchRoute(url.pathname);

  // Browser requests carry an Origin header; reject anything but the allowed one.
  const origin = req.headers.origin;
  if (origin && origin !== ALLOWED_ORIGIN) {
    json(res, 403, { error: 'Origin not allowed' });
    return;
  }

  if (!route) {
    json(res, 404, { error: 'Unknown proxy endpoint', path: url.pathname });
    return;
  }

  // Rate limit
  const ip = clientIP(req);
  if (!rateCheck(ip)) {
    json(res, 429, { error: 'Rate limit exceeded — max 60 requests per minute' });
    return;
  }

  console.log(`[proxy] ${new Date().toISOString()} ${req.method} ${url.pathname}${url.search} → ${route.name}`);

  proxy(req, res, route);
});

server.listen(PORT, () => {
  console.log(`getkeyd CORS proxy running on http://localhost:${PORT}\n`);
  console.log('Allowed origin:', ALLOWED_ORIGIN);
  console.log('Mapped routes:');
  ROUTES.forEach((r) => console.log(`  ${r.prefix}*  →  ${r.target}` + (API_KEYS[r.name] ? ' (key injected server-side)' : '')));
  console.log('\nAPI keys needed (free | set via environment variables):');
  console.log('  HUD  → HUD_TOKEN');
  console.log('  FRED → FRED_API_KEY');
  console.log('  FBI  → FBI_API_KEY\n');
});
