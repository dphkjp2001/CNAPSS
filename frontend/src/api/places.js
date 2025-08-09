// frontend/src/api/places.js
export async function fetchNearbyPlaces({ lat, lon, radius = 1500, types = ["restaurant","cafe","fast food"] }) {
    const params = new URLSearchParams({
      lat, lon, radius, types: types.join(",")
    });
    const res = await fetch(`/api/places/nearby?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load places");
    return res.json();
  }
  