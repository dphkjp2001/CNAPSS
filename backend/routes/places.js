// backend/routes/places.js
const express = require("express");
const NodeCache = require("node-cache");

const router = express.Router();
const cache = new NodeCache({ stdTTL: 60 * 30 }); // 30 minutes

// --- Yelp Fusion ---
const YELP_KEY =
  process.env.YELP_API_KEY ||
  process.env.CNAPSS_YELP_KEY ||
  null;

if (!YELP_KEY) {
  console.warn("[places] YELP_API_KEY is not set.");
}

const YELP_BASE = "https://api.yelp.com/v3";

// Bobst Library (NYU) default
const DEFAULT_CENTER = { lat: 40.729513, lon: -73.997649 };
const DEFAULT_RADIUS = 1500; // meters (Yelp max 40000)
const DEFAULT_TYPES = ["restaurant", "cafe", "fast food"];
const SEARCH_LIMIT = 50; // Yelp max 50 per request

// Map our UI's types -> Yelp category aliases
const CATEGORY_MAP = {
  restaurant: "restaurants",
  cafe: "cafes",
  "fast food": "hotdogs,fastfood", // Yelp alias
};

function headers() {
  return { Authorization: `Bearer ${YELP_KEY}` };
}

// price: "$"~"$$$$" -> 1~4
function priceToNumber(price) {
  if (!price) return null;
  return Math.min(String(price).length, 4);
}

// score by distance + rating + popularity(review_count)
function scorePlace(p, center) {
  const R = 6371000;
  const dLat = ((p.lat - center.lat) * Math.PI) / 180;
  const dLon = ((p.lon - center.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) *
      Math.cos((p.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.sqrt(a)); // meters

  const distanceScore = Math.max(0, 1 - dist / 1500); // taper @1.5km
  const ratingScore =
    typeof p.rating === "number" ? Math.min(Math.max(p.rating / 5, 0), 1) : 0;
  const popularityScore = p.review_count
    ? Math.min(Math.log10(p.review_count + 1) / 3, 1)
    : 0;

  const score =
    0.5 * distanceScore + 0.35 * ratingScore + 0.15 * popularityScore;
  return Math.min(1, Math.max(0, score));
}

function buildCategories(types) {
  const ids = (types || [])
    .map((t) => CATEGORY_MAP[String(t).trim().toLowerCase()])
    .filter(Boolean);
  if (!ids.length) return null;
  return ids.join(",");
}

async function yelpSearch({ lat, lon, radius, types, sortBy = "best_match", term = "" }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    radius: String(Math.min(Math.max(radius, 50), 40000)),
    limit: String(SEARCH_LIMIT),
    sort_by: sortBy, // "best_match" | "rating" | "review_count" | "distance"
  });

  const cats = buildCategories(types);
  if (cats) params.set("categories", cats);
  if (term) params.set("term", term);

  const url = `${YELP_BASE}/businesses/search?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yelp search failed: ${res.status} ${text}`);
  }
  const json = await res.json();

  const items = (json.businesses || [])
    .filter((b) => b.coordinates?.latitude && b.coordinates?.longitude)
    .map((b) => {
      const lat = b.coordinates.latitude;
      const lon = b.coordinates.longitude;
      return {
        id: b.id,
        name: b.name,
        lat,
        lon,
        address: Array.isArray(b.location?.display_address)
          ? b.location.display_address.join(", ")
          : b.location?.address1 || null,
        categories: (b.categories || []).map((c) => c.title),
        distance: b.distance ?? null, // meters from query point
        rating: typeof b.rating === "number" ? b.rating : null, // /5
        review_count: b.review_count ?? 0,
        price: priceToNumber(b.price), // 1~4
        website: b.url || null, // Yelp business page
        phone: b.display_phone || b.phone || null,
        opening_hours: null,
        source: "yelp",
      };
    });

  return items;
}

// GET /api/places/nearby
router.get("/nearby", async (req, res) => {
  const center = {
    lat: parseFloat(req.query.lat) || DEFAULT_CENTER.lat,
    lon: parseFloat(req.query.lon) || DEFAULT_CENTER.lon,
  };
  const radius = parseInt(req.query.radius, 10) || DEFAULT_RADIUS;
  const types = (req.query.types?.split(",") || DEFAULT_TYPES).map((s) =>
    s.trim()
  );

  const minRating = req.query.minRating ? parseFloat(req.query.minRating) : 0;
  const minReviews = req.query.minReviews ? parseInt(req.query.minReviews, 10) : 0;
  const sortBy = req.query.sortBy || "best_match";
  const term = (req.query.term || "").trim();

  const cacheKey = `yelp:${center.lat}:${center.lon}:${radius}:${types.join(
    "|"
  )}:${minRating}:${minReviews}:${sortBy}:${term}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const base = await yelpSearch({
      lat: center.lat,
      lon: center.lon,
      radius,
      types,
      sortBy,
      term,
    });

    const items = base
      .filter(
        (p) =>
          (p.rating ?? 0) >= minRating && (p.review_count ?? 0) >= minReviews
      )
      .map((p) => ({ ...p, score: scorePlace(p, center) }))
      .sort((a, b) => b.score - a.score);

    const payload = { center, radius, count: items.length, items };
    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch places from Yelp", detail: String(err) });
  }
});

// --- Autocomplete (Yelp) ---
// GET /api/places/suggest?text=ram&lat=40.72&lon=-73.99&limit=8
router.get("/suggest", async (req, res) => {
  try {
    const text = (req.query.text || "").trim();
    const lat = parseFloat(req.query.lat) || DEFAULT_CENTER.lat;
    const lon = parseFloat(req.query.lon) || DEFAULT_CENTER.lon;
    const limit = Math.min(parseInt(req.query.limit || "8", 10), 20);

    if (!text) return res.json({ suggestions: [] });

    const params = new URLSearchParams({
      text,
      latitude: String(lat),
      longitude: String(lon),
      limit: String(limit),
    });

    const url = `${YELP_BASE}/autocomplete?${params.toString()}`;
    const r = await fetch(url, { headers: headers() });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Yelp autocomplete failed: ${r.status} ${t}`);
    }
    const j = await r.json();

    const suggestions = [
      ...(j.terms || []).map((t) => ({ type: "term", text: t.text })),
      ...(j.categories || []).map((c) => ({ type: "category", text: c.title, alias: c.alias })),
      ...(j.businesses || []).map((b) => ({ type: "business", text: b.name, id: b.id })),
    ].slice(0, limit);

    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch suggestions", detail: String(err) });
  }
});

module.exports = router;

