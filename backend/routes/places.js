// backend/routes/places.js
const express = require("express");
const NodeCache = require("node-cache");

const router = express.Router({ mergeParams: true }); // ✅ :school 읽기
const cache = new NodeCache({ stdTTL: 60 * 30 }); // 30m

/** ---------- External keys ---------- */
const YELP_KEY =
  process.env.YELP_API_KEY || process.env.CNAPSS_YELP_KEY || null;
if (!YELP_KEY) console.warn("[places] YELP_API_KEY is not set.");
const YELP_BASE = "https://api.yelp.com/v3";

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || "CNAPSS/1.0 (support@cnapss.com)";

/** ---------- Helpers ---------- */
const authHeaders = () => ({ Authorization: `Bearer ${YELP_KEY}` });

const SCHOOL_CONFIG = {
  // Pre-seeded anchors. Add more schools here.
  nyu: {
    displayName: "New York University",
    center: { lat: 40.729513, lon: -73.997649 }, // Bobst
    radius: 1500,
    defaultTypes: ["restaurant", "cafe", "fast food"],
  },
  columbia: {
    displayName: "Columbia University",
    center: { lat: 40.8075, lon: -73.9626 },
    radius: 1500,
    defaultTypes: ["restaurant", "cafe", "fast food"],
  },
};

// Map generic UI types → Yelp category aliases
const CATEGORY_MAP = {
  restaurant: "restaurants",
  cafe: "cafes",
  "fast food": "hotdogs,fastfood",
};

function buildCategories(types) {
  const ids = (types || [])
    .map((t) => CATEGORY_MAP[String(t).trim().toLowerCase()])
    .filter(Boolean);
  return ids.length ? ids.join(",") : null;
}

function priceToNumber(price) {
  if (!price) return null;
  return Math.min(String(price).length, 4);
}

function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = ((a.lat - b.lat) * Math.PI) / 180;
  const dLon = ((a.lon - b.lon) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function scorePlace(p, center) {
  const dist = haversineMeters(p, center);
  const distanceScore = Math.max(0, 1 - dist / 1500);
  const ratingScore =
    typeof p.rating === "number" ? Math.min(Math.max(p.rating / 5, 0), 1) : 0;
  const popularityScore = p.review_count
    ? Math.min(Math.log10(p.review_count + 1) / 3, 1)
    : 0;
  return Math.min(
    1,
    Math.max(0, 0.5 * distanceScore + 0.35 * ratingScore + 0.15 * popularityScore)
  );
}

/** ---------- Geocoding (Nominatim) ---------- */
async function geocodeNominatim(text, bias) {
  if (!text || !text.trim()) return null;

  const params = new URLSearchParams({
    q: text,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
    // countrycodes: "us", // optionally restrict
  });

  // Optional bias near campus anchor
  if (bias && bias.lat && bias.lon) {
    const box = 0.2; // ~ small region
    params.set(
      "viewbox",
      `${bias.lon - box},${bias.lat + box},${bias.lon + box},${bias.lat - box}`
    );
    params.set("bounded", "1");
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Nominatim failed: ${res.status} ${t}`);
  }
  const js = await res.json();
  if (!Array.isArray(js) || js.length === 0) return null;
  return {
    lat: parseFloat(js[0].lat),
    lon: parseFloat(js[0].lon),
    display_name: js[0].display_name || null,
  };
}

/** Resolve school anchor: seeded → cached geocode → fresh geocode */
async function resolveSchoolAnchor(school) {
  const s = String(school || "").toLowerCase();
  if (SCHOOL_CONFIG[s]?.center) return SCHOOL_CONFIG[s];

  const ck = `anchor:${s}`;
  const cached = cache.get(ck);
  if (cached) return cached;

  const q = `${s} university campus`;
  const hit = await geocodeNominatim(q);
  if (hit?.lat && hit?.lon) {
    const cfg = {
      displayName: s.toUpperCase(),
      center: { lat: hit.lat, lon: hit.lon },
      radius: 1500,
      defaultTypes: ["restaurant", "cafe", "fast food"],
    };
    cache.set(ck, cfg, 60 * 60 * 12);
    return cfg;
  }
  return null;
}

/** ---------- Yelp Search ---------- */
async function yelpSearch({
  lat,
  lon,
  radius,
  categories,           // CSV string of Yelp aliases
  sortBy = "best_match",
  term = "",
  priceLevels,          // "1,2,3,4"
  openNow,              // boolean
}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    radius: String(Math.min(Math.max(radius, 50), 40000)),
    limit: "50",
    sort_by: sortBy, // rating | review_count | distance | best_match
  });
  if (categories) params.set("categories", categories);
  if (term) params.set("term", term);
  if (priceLevels) params.set("price", String(priceLevels));
  if (openNow === true || String(openNow).toLowerCase() === "true") {
    params.set("open_now", "true");
  }

  const url = `${YELP_BASE}/businesses/search?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yelp search failed: ${res.status} ${text}`);
  }
  const j = await res.json();
  const items = (j.businesses || [])
    .filter((b) => b.coordinates?.latitude && b.coordinates?.longitude)
    .map((b) => ({
      id: b.id,
      name: b.name,
      lat: b.coordinates.latitude,
      lon: b.coordinates.longitude,
      address: Array.isArray(b.location?.display_address)
        ? b.location.display_address.join(", ")
        : b.location?.address1 || null,
      categories: (b.categories || []).map((c) => c.title),
      distance: b.distance ?? null,
      rating: typeof b.rating === "number" ? b.rating : null,
      review_count: b.review_count ?? 0,
      price: priceToNumber(b.price),
      website: b.url || null,
      phone: b.display_phone || b.phone || null,
      opening_hours: null,
      source: "yelp",
    }));
  return items;
}

/** ---------- Routes ---------- */
// GET /api/:school/places/nearby
// Query supports:
//  - address (or q) -> geocode first
//  - lat, lon, radius
//  - types, categories, priceLevels, openNow, minRating, minReviews, sortBy, term
router.get("/nearby", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const seeded = SCHOOL_CONFIG[school] || null;
    const anchor = seeded || (await resolveSchoolAnchor(school));

    if (!anchor?.center?.lat || !anchor?.center?.lon) {
      return res.status(500).json({ error: "No anchor center for school", school });
    }

    const qAddress = (req.query.address || req.query.q || "").toString().trim();
    let baseCenter = { ...anchor.center };

    // If address given, geocode & replace center (bias near campus)
    if (qAddress) {
      const ck = `addr:${school}:${qAddress}`;
      const cached = cache.get(ck);
      let geocoded = cached;
      if (!geocoded) {
        geocoded = await geocodeNominatim(qAddress, anchor.center);
        if (geocoded) cache.set(ck, geocoded, 60 * 60);
      }
      if (geocoded?.lat && geocoded?.lon) {
        baseCenter = { lat: geocoded.lat, lon: geocoded.lon };
      }
    }

    const center = {
      lat: req.query.lat ? parseFloat(req.query.lat) : baseCenter.lat,
      lon: req.query.lon ? parseFloat(req.query.lon) : baseCenter.lon,
    };
    const radius = req.query.radius
      ? parseInt(req.query.radius, 10)
      : anchor.radius || 1500;

    const types = (req.query.types
      ? String(req.query.types).split(",")
      : anchor.defaultTypes || ["restaurant", "cafe"]).map((s) => s.trim());

    // categories = UI types + optional cuisines CSV → Yelp alias CSV
    const rawCats = String(req.query.categories || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const fromTypes = (buildCategories(types) || "").split(",").filter(Boolean);
    const catSet = new Set(fromTypes);
    for (const c of rawCats) {
      // If UI sends real Yelp alias use as-is
      for (const a of c.split(",")) if (a) catSet.add(a);
    }
    const categories = Array.from(catSet).join(",") || null;

    const minRating = req.query.minRating ? parseFloat(req.query.minRating) : 0;
    const minReviews = req.query.minReviews ? parseInt(req.query.minReviews, 10) : 0;
    const sortBy = req.query.sortBy || "best_match";
    const term = (req.query.term || "").trim();
    const priceLevels = String(req.query.priceLevels || req.query.price || "")
      .split(",")
      .map((n) => parseInt(n, 10))
      .filter((n) => [1, 2, 3, 4].includes(n))
      .join(",") || null;
    const openNow = ["1", "true", "yes", "on"].includes(
      String(req.query.openNow).toLowerCase()
    );

    const key = [
      school,
      center.lat,
      center.lon,
      radius,
      types.join("|"),
      categories || "",
      minRating,
      minReviews,
      sortBy,
      term,
      priceLevels || "",
      openNow ? "1" : "0",
    ].join(":");

    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const base = await yelpSearch({
      lat: center.lat,
      lon: center.lon,
      radius,
      categories,
      sortBy,
      term,
      priceLevels,
      openNow,
    });

    const items = base
      .filter((p) => (p.rating ?? 0) >= minRating && (p.review_count ?? 0) >= minReviews)
      .map((p) => ({ ...p, score: scorePlace(p, center) }))
      .sort((a, b) => b.score - a.score);

    const payload = {
      school,
      center,
      radius,
      count: items.length,
      items,
      anchor: anchor.center,
    };
    cache.set(key, payload);
    res.json(payload);
  } catch (err) {
    console.error("[places nearby]", err);
    res.status(500).json({ error: "Failed to fetch places", detail: String(err) });
  }
});

// GET /api/:school/places/geocode?address=...
router.get("/geocode", async (req, res) => {
  try {
    const school = String(req.params.school || "").toLowerCase();
    const anchor = SCHOOL_CONFIG[school] || (await resolveSchoolAnchor(school));
    const q = (req.query.address || req.query.q || "").toString().trim();
    if (!q) return res.json({ address: null });

    const hit = await geocodeNominatim(q, anchor?.center);
    res.json({ address: q, center: hit ? { lat: hit.lat, lon: hit.lon } : null });
  } catch (e) {
    res.status(500).json({ error: "geocode failed" });
  }
});

// GET /api/:school/places/suggest?text=...&latitude=...&longitude=...&limit=8
router.get("/suggest", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();
    const latitude = req.query.latitude ? parseFloat(req.query.latitude) : null;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 8;

    if (!text) return res.json({ suggestions: [] });

    const params = new URLSearchParams({
      text,
      ...(latitude != null && { latitude }),
      ...(longitude != null && { longitude }),
      ...(limit && { limit }),
    });
    const url = `${YELP_BASE}/autocomplete?${params}`;
    const r = await fetch(url, { headers: authHeaders() });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Yelp autocomplete failed: ${r.status} ${t}`);
    }
    const j = await r.json();
    const suggestions = [
      ...(j.categories || []).map((c) => ({ type: "category", text: c.title })),
      ...(j.terms || []).map((t) => ({ type: "term", text: t.text })),
      ...(j.businesses || []).map((b) => ({ type: "business", text: b.name })),
    ].slice(0, limit);
    res.json({ suggestions });
  } catch (e) {
    console.error("[places suggest]", e);
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;



