// frontend/src/pages/food/FoodMap.jsx
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchNearbyPlaces } from "../../api/places";

function markerIcon(score) {
  const size = 28;
  const hue = Math.round(120 * score); // red->green
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z" fill="hsl(${hue},80%,45%)"/>
      <circle cx="12" cy="9" r="3.2" fill="white"/>
    </svg>`;
  return L.divIcon({ html: svg, iconSize: [size, size], className: "" });
}

export default function FoodMap() {
  const NYU = useMemo(() => ({ lat: 40.7291, lon: -73.9965 }), []);
  const [data, setData] = useState(null);
  const [types, setTypes] = useState(["restaurant","cafe","fast food"]);
  const [radius, setRadius] = useState(1200);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchNearbyPlaces({ lat: NYU.lat, lon: NYU.lon, radius, types })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [NYU, radius, types]);

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col">
      <div className="p-2 flex flex-wrap items-center gap-3 border-b">
        <div className="text-sm font-semibold">Food Map (NYU)</div>
        <label className="text-sm">Radius (m):</label>
        <input className="border rounded px-2 py-1 w-24"
               type="number" min={200} max={3000}
               value={radius}
               onChange={e => setRadius(Number(e.target.value))}/>
        <div className="flex gap-3 text-sm">
          {["restaurant","cafe","fast food"].map(t => (
            <label key={t} className="flex items-center gap-1">
              <input type="checkbox"
                checked={types.includes(t)}
                onChange={() => setTypes(prev => prev.includes(t) ? prev.filter(x => x!==t) : [...prev, t])}/>
              {t}
            </label>
          ))}
        </div>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
        {data && <span className="text-xs text-gray-500">{data.count} spots</span>}
      </div>

      <div className="flex-1">
        <MapContainer center={[NYU.lat, NYU.lon]} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data?.items?.map(p => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={markerIcon(p.score)}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{p.name}</div>
                  {p.categories?.length ? <div className="text-xs">{p.categories.join(", ")}</div> : null}
                  {p.address && <div className="text-xs">{p.address}</div>}
                  <div className="text-xs">Score: {(p.score*100|0)}/100</div>
                  {typeof p.rating === "number" && <div className="text-xs">FSQ Rating: {p.rating.toFixed(1)}/10</div>}
                  {typeof p.price === "number" && <div className="text-xs">Price: {"$".repeat(p.price)}</div>}
                  {p.opening_hours && <div className="text-xs">Hours: {Array.isArray(p.opening_hours) ? p.opening_hours.join(" · ") : p.opening_hours}</div>}
                  <div className="flex gap-2 pt-1">
                    {p.website && <a className="text-blue-600 underline text-xs" href={p.website} target="_blank" rel="noreferrer">Website</a>}
                    {p.phone && <a className="text-blue-600 underline text-xs" href={`tel:${p.phone}`}>Call</a>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
