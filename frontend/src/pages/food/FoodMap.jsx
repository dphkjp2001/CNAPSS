// frontend/src/pages/food/FoodMap.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchNearbyPlaces } from "../../api/places";

// dynamic marker color by score (0~1)
function markerIcon(score = 0) {
  const s = Number.isFinite(score) ? score : 0;
  const size = 28;
  const hue = Math.round(120 * s); // 0=red -> 120=green
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z" fill="hsl(${hue},80%,45%)"/>
      <circle cx="12" cy="9" r="3.2" fill="white"/>
    </svg>`;
  return L.divIcon({ html: svg, iconSize: [size, size], className: "" });
}

export default function FoodMap() {
  // Bobst Library coords
  const BOBST = useMemo(() => ({ lat: 40.729513, lon: -73.997649 }), []);

  // Bobst center icon (memoize to avoid SSR/build timing issues)
  const bobstIcon = useMemo(
    () =>
      L.divIcon({
        html: `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
          <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z" fill="#6b21a8"/>
          <path d="M7.5 8.2c0-.66.54-1.2 1.2-1.2h6.8c.66 0 1.2.54 1.2 1.2v5.2c0 .66-.54 1.2-1.2 1.2H8.7c-.66 0-1.2-.54-1.2-1.2V8.2zm2 .8h5v.8h-5V9z" fill="white"/>
        </svg>`,
        iconSize: [30, 30],
        className: "",
      }),
    []
  );

  const [data, setData] = useState(null);
  const [types, setTypes] = useState(["restaurant", "cafe", "fast food"]);
  const [radius, setRadius] = useState(1200); // meters
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const res = await fetchNearbyPlaces({
          lat: BOBST.lat,
          lon: BOBST.lon,
          radius,
          types,
          // Yelp 기준 "인기 맛집" 기본값(원하면 조정)
          minRating: 4.0,
          minReviews: 50,
          sortBy: "rating",
        });
        if (!cancelled) setData(res);
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMsg("Failed to load places.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [BOBST, radius, types]);

  // guard: only valid lat/lon
  const safeItems = useMemo(
    () =>
      (data?.items || []).filter(
        (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
      ),
    [data]
  );

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col">
      <div className="p-2 flex flex-wrap items-center gap-3 border-b">
        <div className="text-sm font-semibold">
          Food Map (NYU · Bobst Library)
        </div>
        <label className="text-sm">Radius (m):</label>
        <input
          className="border rounded px-2 py-1 w-24"
          type="number"
          min={200}
          max={3000}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        />
        <div className="flex gap-3 text-sm">
          {["restaurant", "cafe", "fast food"].map((t) => (
            <label key={t} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={types.includes(t)}
                onChange={() =>
                  setTypes((prev) =>
                    prev.includes(t)
                      ? prev.filter((x) => x !== t)
                      : [...prev, t]
                  )
                }
              />
              {t}
            </label>
          ))}
        </div>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
        {data && <span className="text-xs text-gray-500">{data.count} spots</span>}
        {errorMsg && <span className="text-xs text-red-500">{errorMsg}</span>}
      </div>

      <div className="flex-1">
        <MapContainer
          center={[BOBST.lat, BOBST.lon]}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Bobst Library marker + label */}
          <Marker position={[BOBST.lat, BOBST.lon]} icon={bobstIcon}>
            <Popup>Elmer Holmes Bobst Library (NYU)</Popup>
            {/* Tooltip: react-leaflet v4 이상에서 사용 */}
            <Tooltip direction="top" offset={[0, -18]} opacity={1} permanent>
              Bobst Library
            </Tooltip>
          </Marker>

          {/* Visual center highlight */}
          <Circle
            center={[BOBST.lat, BOBST.lon]}
            radius={80}
            color="#6b21a8"
            fillColor="#c4b5fd"
            fillOpacity={0.25}
            weight={2}
          />

          {/* Search radius outline */}
          <Circle
            center={[BOBST.lat, BOBST.lon]}
            radius={radius}
            color="#6b21a8"
            fillOpacity={0}
            weight={1.5}
            dashArray="6 6"
          />

          {/* Restaurant markers */}
          {safeItems.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lon]}
              icon={markerIcon(p.score)}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{p.name}</div>
                  {p.categories?.length ? (
                    <div className="text-xs">{p.categories.join(", ")}</div>
                  ) : null}
                  {p.address && <div className="text-xs">{p.address}</div>}
                  <div className="text-xs">
                    Score: {Math.max(0, Math.floor((p.score || 0) * 100))}/100
                  </div>
                  {/* Yelp rating is /5 */}
                  {typeof p.rating === "number" && (
                    <div className="text-xs">Rating: {p.rating.toFixed(1)}/5</div>
                  )}
                  {typeof p.price === "number" && (
                    <div className="text-xs">Price: {"$".repeat(p.price)}</div>
                  )}
                  {p.opening_hours && (
                    <div className="text-xs">
                      Hours:{" "}
                      {Array.isArray(p.opening_hours)
                        ? p.opening_hours.join(" · ")
                        : p.opening_hours}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {p.website && (
                      <a
                        className="text-blue-600 underline text-xs"
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Yelp Page
                      </a>
                    )}
                    {p.phone && (
                      <a
                        className="text-blue-600 underline text-xs"
                        href={`tel:${p.phone}`}
                      >
                        Call
                      </a>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 pt-1">
                    Ratings & reviews data © Yelp
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
