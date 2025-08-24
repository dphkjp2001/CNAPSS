// frontend/src/api/places.js
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const auth = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export async function fetchNearbyPlaces({
  school,
  token,
  address,        // ✅ NEW: address or place name for geocoding
  lat,
  lon,
  radius,
  types = ["restaurant", "cafe", "fast food"],
  minRating = 0,
  minReviews = 0,
  sortBy = "best_match",
  term = "",
}) {
  const s = String(school || "").toLowerCase().trim();
  const params = new URLSearchParams({
    ...(address && { address }),  // ✅ server will geocode this first
    ...(lat != null && { lat }),
    ...(lon != null && { lon }),
    ...(radius != null && { radius }),
    types: types.join(","),
    minRating,
    minReviews,
    sortBy,
    ...(term && { term }),
  });
  const res = await fetch(`${API}/${s}/places/nearby?${params.toString()}`, {
    headers: auth(token),
  });
  if (!res.ok) throw new Error(`Failed to load places: ${res.status}`);
  return res.json();
}


/** Yelp autocomplete proxy
 * GET /api/:school/places/suggest?text=...&latitude=...&longitude=...&limit=...
 */
export async function fetchPlaceSuggestions({ school, token, text, lat, lon, limit = 8 }) {
  const s = String(school || "").toLowerCase().trim();
  const params = new URLSearchParams({
    text: String(text || ""),
    ...(lat != null && { latitude: String(lat) }),   // ✅ backend expects 'latitude'
    ...(lon != null && { longitude: String(lon) }), // ✅ backend expects 'longitude'
    limit: String(limit),
  });

  const res = await fetch(`${API}/${s}/places/suggest?${params.toString()}`, {
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Failed to load suggestions");
  return res.json(); // { suggestions: [...] }
}


export async function geocodeAddress({ school, token, address }) {
  const s = String(school || "").toLowerCase().trim();
  const params = new URLSearchParams({ address });
  const res = await fetch(`${API}/${s}/places/geocode?${params.toString()}`, {
    headers: auth(token),
  });
  if (!res.ok) throw new Error("Geocode failed");
  return res.json();
}

