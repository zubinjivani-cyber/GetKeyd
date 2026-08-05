/*
 * getkeyd Google Places enrichment worker — Cloudflare Workers, ES module, zero deps.
 *
 * Holds the Google Places API key server-side (never ship it in static-site JS)
 * and queries Places API (New) Text Search on demand, returning a compact shape.
 *
 * DEPLOYMENT (Workers dashboard):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. Name it (e.g. "getkeyd-places"), paste this entire file into the editor.
 *   3. Settings → Variables and Secrets → Add secret binding:
 *        GOOGLE_PLACES_KEY = <Places API key>  (console.cloud.google.com → "Places API (New)" → Credentials)
 *   4. Optional but recommended — Settings → Variables → plain-text binding:
 *        ALLOWED_ORIGIN = https://getkeyd.app   (blocks other sites from using the worker)
 *   5. Deploy. Copy the Worker URL (https://getkeyd-places.<subdomain>.workers.dev)
 *      into js/proxy-config.js → window.__GK_GOOGLE.endpoint and set enabled: true.
 *
 * COST: the Worker itself is free (100k requests/day on the free plan). Google
 * Places Text Search (New) bills per request at the highest SKU rate of any
 * field in the field mask, after a free usage cap per month:
 *     Pro fields (displayName, formattedAddress, location): 5,000 free, then $32/1k
 *     Enterprise fields (rating, userRatingCount, phone, website): 1,000 free, then $35/1k
 * This worker's mask includes Enterprise fields, so it gets 1,000 free
 * searches/month, then ~$0.035 each. No other Google SKUs are triggered.
 *
 * CACHING RULE: Google Maps Platform ToS forbids storing Place data
 * server-side. This worker is stateless — it caches nothing, stores nothing,
 * and every request is a fresh live query. Do NOT add caching.
 *
 * Usage: GET /?q=<text>&lat=<float>&lng=<float>&radius=<meters, default 50000>
 *   → 200 { source: 'google', results: [{ name, address, phone, website,
 *         rating, reviewCount, lat, lng }] } (empty fields omitted)
 *   → 4xx/5xx { error: ... } (Google statuses passed through; key never leaked)
 */

const GOOGLE_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Verified against the Places API (New) REST reference (2026): displayName is a
// LocalizedText object; nationalPhoneNumber is the scalar web-service field
// (there is no "phoneNumbers" field in the web-service mask); rating +
// userRatingCount are the rating fields; location is a LatLng object.
const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.location',
].join(',');

// Google clamps Text Search radius to 50,000 m; mirror that here.
const MAX_RADIUS = 50000;
const DEFAULT_RADIUS = 50000;
const TIMEOUT_MS = 10000;

function corsOrigin(request, env) {
  if (!env.ALLOWED_ORIGIN) return '*';
  const origin = request.headers.get('Origin');
  // Echo the request Origin when it matches the allowlist, else the allowlist
  // (mismatched Origins are rejected with 403 before any response is served).
  return origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
}

function json(status, body, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin(request, env),
      'Cache-Control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin(request, env),
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    }
    if (request.method !== 'GET') {
      return json(405, { error: 'Method not allowed' }, request, env);
    }

    // Same fail-closed origin check as the site's proxy.js: browsers must send
    // an allowed Origin when ALLOWED_ORIGIN is configured.
    const origin = request.headers.get('Origin');
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return json(403, { error: 'Origin not allowed' }, request, env);
    }

    if (!env.GOOGLE_PLACES_KEY) {
      return json(500, { error: 'GOOGLE_PLACES_KEY binding is not configured' }, request, env);
    }

    const q = (url.searchParams.get('q') || '').trim();
    if (!q) {
      return json(400, { error: 'Missing required parameter: q' }, request, env);
    }

    // Optional location bias (both lat and lng required; else search without it).
    const body = { textQuery: q };
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const radius = parseFloat(url.searchParams.get('radius'));
      const clamped = Number.isFinite(radius) ? Math.min(Math.max(radius, 1), MAX_RADIUS) : DEFAULT_RADIUS;
      body.locationBias = {
        circle: { center: { latitude: lat, longitude: lng }, radius: clamped },
      };
    }

    let res;
    try {
      res = await fetch(GOOGLE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_PLACES_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      return json(504, { error: 'Google Places API timed out or unreachable' }, request, env);
    }

    const data = await res.json().catch(() => null);

    // Pass Google's status through (covers 400/403/429) but never echo the raw
    // body or the key — extract only the error message/status.
    if (!res.ok) {
      const g = (data && data.error) || {};
      const message = typeof g.message === 'string' ? g.message : 'Google Places API error';
      const code = typeof g.code === 'number' ? g.code : res.status;
      return json(res.status, { error: { code, message, status: g.status } }, request, env);
    }

    if (!data || !Array.isArray(data.places)) {
      return json(502, { error: 'Unexpected response from Google Places API' }, request, env);
    }

    const results = [];
    for (const p of data.places) {
      const out = {};
      if (p.displayName && p.displayName.text) out.name = p.displayName.text;
      if (p.formattedAddress) out.address = p.formattedAddress;
      if (p.nationalPhoneNumber) out.phone = p.nationalPhoneNumber;
      if (p.websiteUri) out.website = p.websiteUri;
      if (typeof p.rating === 'number') out.rating = p.rating;
      if (Number.isInteger(p.userRatingCount)) out.reviewCount = p.userRatingCount;
      if (p.location && typeof p.location.latitude === 'number') out.lat = p.location.latitude;
      if (p.location && typeof p.location.longitude === 'number') out.lng = p.location.longitude;
      if (out.name) results.push(out);
    }

    return json(200, { source: 'google', results }, request, env);
  },
};
