// backend/routes/places.js
const express = require("express");
const NodeCache = require("node-cache");

const router = express.Router();
const cache = new NodeCache({ stdTTL: 60 * 30 }); // 30m cache

// --- Yelp Fusion ---
const YELP_KEY =
  process.env.YELP_API_KEY ||
  process.env.CNAPSS_YELP_KEY || // optional fallback
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
  "fast food": "hotdogs,fastfood", // 'hotdogs' = Yelp의 fast food 카테고리 alias
};

// --- Helpers ---
function headers() {
  return { Authorization: `Bearer ${YELP_KEY}` };
}

// price: "$"~"$$$$" -> number 1~4
function priceToNumber(price) {
  if (!price) return null;
  return Math.min(String(price).length, 4);
}

// scoring: distance + rating + popularity(review_count)
// rating is 0~5 -> normalize
function scorePlace(p, center) {
  // haversine distance
  const R = 6371000;
  const dLat = (p.lat - center.lat) * Math.PI / 180;
  const dLon = (p.lon - center.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(center.lat * Math.PI / 180) *
      Math.cos(p.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.sqrt(a)); // meters

  const distanceScore = Math.max(0, 1 - dist / 1500); // 1.5km taper
  const ratingScore =
    typeof p.rating === "number" ? Math.min(Math.max(p.rating / 5, 0), 1) : 0;
  // review_count: 0 ~ big; compress with log
  const popularityScore = p.review_count
    ? Math.min(Math.log10(p.review_count + 1) / 3, 1)
    : 0;

  const score =
    0.5 * distanceScore + 0.35 * ratingScore + 0.15 * popularityScore;
  return Math.min(1, Math.max(0, score));
}

function buildCategories(types) {
  const ids = types
    .map((t) => CATEGORY_MAP[t.trim().toLowerCase()])
    .filter(Boolean);
  if (!ids.length) return null;
  return ids.join(",");
}

// --- Yelp search ---
async function yelpSearch({ lat, lon, radius, types, sortBy = "best_match" }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    radius: String(Math.min(Math.max(radius, 50), 40000)),
    limit: String(SEARCH_LIMIT),
    sort_by: sortBy, // "best_match" | "rating" | "review_count" | "distance"
  });

  const cats = buildCategories(types);
  if (cats) params.set("categories", cats);
  else params.set("term", types.join(" ")); // fallback

  const url = `${YELP_BASE}/businesses/search?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yelp search failed: ${res.status} ${text}`);
  }
  const json = await res.json();

  // Normalize to our schema
  const items = (json.businesses || [])
    .filter((b) => b.coordinates?.latitude && b.coordinates?.longitude)
    .map((b) => {
      const lat = b.coordinates.latitude;
      const lon = b.coordinates.longitude;
      const item = {
        id: b.id,
        name: b.name,
        lat,
        lon,
        address: Array.isArray(b.location?.display_address)
          ? b.location.display_address.join(", ")
          : b.location?.address1 || null,
        categories: (b.categories || []).map((c) => c.title),
        distance: b.distance ?? null, // meters from query point
        rating: typeof b.rating === "number" ? b.rating : null, // 0~5
        review_count: b.review_count ?? 0,
        price: priceToNumber(b.price), // 1~4 or null
        website: b.url || null, // Yelp business URL
        phone: b.display_phone || b.phone || null,
        opening_hours: null, // need /businesses/{id} for hours (optional)
        source: "yelp",
      };
      return item;
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

  // optional filters from query
  const minRating = req.query.minRating ? parseFloat(req.query.minRating) : 0; // e.g., 4.0
  const minReviews = req.query.minReviews ? parseInt(req.query.minReviews, 10) : 0; // e.g., 50
  const sortBy = req.query.sortBy || "best_match"; // yelp server-side hint

  const cacheKey = `yelp:${center.lat}:${center.lon}:${radius}:${types.join(
    "|"
  )}:${minRating}:${minReviews}:${sortBy}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const base = await yelpSearch({
      lat: center.lat,
      lon: center.lon,
      radius,
      types,
      sortBy,
    });

    // local filter + score
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

module.exports = router;
