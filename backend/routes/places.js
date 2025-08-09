// backend/routes/places.js
const express = require("express");
const fetch = require("node-fetch");
const NodeCache = require("node-cache");

const router = express.Router();
const cache = new NodeCache({ stdTTL: 60 * 30 }); // 30 min cache

const FSQ_BASE = "https://api.foursquare.com/v3";
const FSQ_KEY = process.env.FOURSQUARE_API_KEY;
if (!FSQ_KEY) {
  console.warn("[places] FOURSQUARE_API_KEY is not set.");
}

const DEFAULT_CENTER = { lat: 40.7291, lon: -73.9965 }; // NYU
const DEFAULT_RADIUS = 1500; // meters
const DEFAULT_TYPES = ["restaurant", "cafe", "fast food"];
const SEARCH_LIMIT = 50;     // keep it small to stay free-tier friendly
const DETAIL_LIMIT = 35;     // detail calls can be heavier; trim more

// very lightweight score:
// distance(0~1, closer is better) + rating(0~1) + popularity(0~1, optional) with weights
function scorePlace(p, center) {
  // distance
  const R = 6371000;
  const dLat = (p.lat - center.lat) * Math.PI / 180;
  const dLon = (p.lon - center.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(center.lat*Math.PI/180) * Math.cos(p.lat*Math.PI/180) *
    Math.sin(dLon/2)**2;
  const dist = 2 * R * Math.asin(Math.sqrt(a)); // meters
  const distanceScore = Math.max(0, 1 - dist / 1500); // 1.5km taper

  // rating from FSQ (0~10). Normalize to 0~1
  const ratingScore = typeof p.rating === "number" ? Math.min(Math.max(p.rating, 0), 10) / 10 : 0;

  // popularity (0~1) if present
  const popularityScore = typeof p.popularity === "number" ? Math.min(Math.max(p.popularity, 0), 1) : 0;

  const score = (0.55 * distanceScore) + (0.35 * ratingScore) + (0.10 * popularityScore);
  return Math.min(1, Math.max(0, score));
}

function headers() {
  return {
    "Authorization": FSQ_KEY,
    "accept": "application/json"
  };
}

// FSQ category IDs (subset). Tweak freely later.
// Ref: Foursquare Places categories. IDs can change; keep this small and override via query if needed.
const CATEGORY_MAP = {
  restaurant: "13065",
  cafe: "13032",
  "fast food": "13332",
};

function resolveCategories(types) {
  const ids = types
    .map(t => CATEGORY_MAP[t.trim().toLowerCase()])
    .filter(Boolean);
  // If none matched, fallback to a broad food search by query
  return ids.length ? ids.join(",") : null;
}

async function fsqSearch({ lat, lon, radius, types }) {
  const categories = resolveCategories(types);
  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    radius: String(radius),
    limit: String(SEARCH_LIMIT),
    sort: "RELEVANCE",
  });
  if (categories) params.set("categories", categories);
  else params.set("query", types.join(" ")); // fallback: text query

  const url = `${FSQ_BASE}/places/search?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`FSQ Search failed: ${res.status}`);
  const json = await res.json();

  // normalize minimal fields
  const items = (json.results || []).map(r => ({
    fsq_id: r.fsq_id,
    name: r.name,
    lat: r.geocodes?.main?.latitude,
    lon: r.geocodes?.main?.longitude,
    distance: r.distance, // meters (FSQ-provided)
    address: r.location?.formatted_address || null,
    categories: (r.categories || []).map(c => c.name),
  })).filter(p => p.lat && p.lon);

  return items.slice(0, DETAIL_LIMIT);
}

async function fsqDetailsBatch(ids) {
  // No official batch in v3; do parallel with Promise.all but keep it modest.
  const tasks = ids.map(id => fetch(`${FSQ_BASE}/places/${id}`, { headers: headers() })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  );
  const results = await Promise.all(tasks);
  return results.filter(Boolean).map(d => ({
    fsq_id: d.fsq_id,
    rating: typeof d.rating === "number" ? d.rating : null, // 0~10 (often null on free tier; handle gracefully)
    popularity: typeof d.popularity === "number" ? d.popularity : null, // 0~1 (may be missing)
    price: typeof d.price === "number" ? d.price : null, // 1~4 (if present)
    hours: d.hours || null,
    website: d.website || null,
    tel: d.tel || d.phone || null,
  }));
}

router.get("/nearby", async (req, res) => {
  const center = {
    lat: parseFloat(req.query.lat) || DEFAULT_CENTER.lat,
    lon: parseFloat(req.query.lon) || DEFAULT_CENTER.lon,
  };
  const radius = parseInt(req.query.radius, 10) || DEFAULT_RADIUS;
  const types = (req.query.types?.split(",") || DEFAULT_TYPES).map(s => s.trim());

  const cacheKey = `fsq:${center.lat}:${center.lon}:${radius}:${types.join("|")}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const base = await fsqSearch({ lat: center.lat, lon: center.lon, radius, types });
    const details = await fsqDetailsBatch(base.map(b => b.fsq_id));
    const detailMap = new Map(details.map(d => [d.fsq_id, d]));

    const items = base.map(b => {
      const d = detailMap.get(b.fsq_id) || {};
      const merged = {
        id: b.fsq_id,
        name: b.name,
        lat: b.lat,
        lon: b.lon,
        address: b.address,
        categories: b.categories,
        distance: b.distance,
        rating: d.rating ?? null,
        popularity: d.popularity ?? null,
        price: d.price ?? null,
        opening_hours: d.hours?.display || null,
        website: d.website || null,
        phone: d.tel || null,
        source: "foursquare",
      };
      return { ...merged, score: scorePlace(merged, center) };
    }).sort((a, b) => b.score - a.score);

    const payload = { center, radius, count: items.length, items };
    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch places from Foursquare" });
  }
});

module.exports = router;
