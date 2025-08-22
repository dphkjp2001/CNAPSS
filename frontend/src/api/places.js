// frontend/src/api/places.js
const API = import.meta.env.VITE_API_URL; // ex) https://<render-app>.onrender.com/api

export async function fetchNearbyPlaces({
  lat, lon, radius = 1500,
  types = ["restaurant","cafe","fast food"],
  minRating = 0, minReviews = 0, sortBy = "best_match",
  term = "",
}) {
  if (!API) throw new Error("VITE_API_URL is not set");
  const params = new URLSearchParams({
    lat, lon, radius,
    types: types.join(","),
    minRating, minReviews, sortBy,
  });
  if (term) params.set("term", term);
  const res = await fetch(`${API}/places/nearby?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load places: ${res.status} ${text}`);
  }
  return res.json();
}

export async function fetchPlaceSuggestions({ text, lat, lon, limit = 8 }) {
  if (!API) throw new Error("VITE_API_URL is not set");
  const params = new URLSearchParams({
    text, lat, lon, limit: String(limit),
  });
  const res = await fetch(`${API}/places/suggest?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load suggestions");
  return res.json(); // { suggestions: [...] }
}
