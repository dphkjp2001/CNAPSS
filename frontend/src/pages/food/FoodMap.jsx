// frontend/src/pages/food/FoodMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchNearbyPlaces, fetchPlaceSuggestions } from "../../api/places";

// ---- utilities ----
function markerIcon(score = 0, active = false) {
  const s = Number.isFinite(score) ? score : 0;
  const size = active ? 34 : 28;
  const hue = Math.round(120 * s); // 0=red -> 120=green
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z"
        fill="hsl(${hue},80%,${active ? "40%" : "45%"})" stroke="${active ? "#111" : "none"}" stroke-width="${active ? 0.8 : 0}"/>
      <circle cx="12" cy="9" r="3.2" fill="white"/>
    </svg>`;
  return L.divIcon({ html: svg, iconSize: [size, size], className: "" });
}

function Stars({ value = 0 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="text-[11px]">
      {"★".repeat(full)}
      {half ? "☆" : ""}
      <span className="text-gray-300">{"☆".repeat(5 - full - (half ? 1 : 0))}</span>
    </span>
  );
}

function metersToMinWalk(m) {
  if (!Number.isFinite(m)) return null;
  return Math.round(m / 80); // 80m/min
}

function FlyToAndOpen({ target, open }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lon], 17, { duration: 0.6 });
    const t = setTimeout(() => open?.(), 650);
    return () => clearTimeout(t);
  }, [target, open, map]);
  return null;
}

export default function FoodMap() {
  const BOBST = useMemo(() => ({ lat: 40.729513, lon: -73.997649 }), []);

  const [data, setData] = useState(null);
  const [types, setTypes] = useState(["restaurant", "cafe", "fast food"]);
  const [radius, setRadius] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // search/sort filters
  const [term, setTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // rating | review_count | distance | best_match
  const [minRating, setMinRating] = useState(4.0);
  const [minReviews, setMinReviews] = useState(20);

  // autocomplete
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  // selection highlight
  const [activeId, setActiveId] = useState(null);
  const markersRef = useRef(new Map());
  const activePlace = useMemo(
    () => (data?.items || []).find((x) => x.id === activeId) || null,
    [data, activeId]
  );

  // fetch places
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setErrorMsg("");
        const res = await fetchNearbyPlaces({
          lat: BOBST.lat,
          lon: BOBST.lon,
          radius,
          types,
          minRating,
          minReviews,
          sortBy,
          term: term.trim(),
        });
        if (!cancelled) {
          setData(res);
          if (!activeId && res.items?.length) setActiveId(res.items[0].id);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMsg("Failed to load places.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [BOBST, radius, types, minRating, minReviews, sortBy, term]);

  // suggestions (debounced)
  useEffect(() => {
    let timer;
    const q = term.trim();
    if (q.length >= 2) {
      timer = setTimeout(async () => {
        try {
          const { suggestions } = await fetchPlaceSuggestions({
            text: q, lat: BOBST.lat, lon: BOBST.lon, limit: 8,
          });
          setSuggests(suggestions || []);
          setShowSuggests(true);
          setHighlightIdx(-1);
        } catch {
          setSuggests([]);
          setShowSuggests(false);
        }
      }, 200);
    } else {
      setSuggests([]);
      setShowSuggests(false);
    }
    return () => clearTimeout(timer);
  }, [term, BOBST]);

  function chooseSuggestion(s) {
    // 간단하게: 선택 시 텍스트를 term으로 넣고 검색
    setTerm(s.text);
    setShowSuggests(false);
  }

  function onTermKeyDown(e) {
    if (!showSuggests || suggests.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggests.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + suggests.length) % suggests.length);
    } else if (e.key === "Enter") {
      if (highlightIdx >= 0) {
        e.preventDefault();
        chooseSuggestion(suggests[highlightIdx]);
      }
    } else if (e.key === "Escape") {
      setShowSuggests(false);
    }
  }

  const items = useMemo(
    () =>
      (data?.items || []).filter(
        (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
      ),
    [data]
  );

  return (
    <div className="w-full h-[calc(100vh-80px)] flex">
      {/* Left: map */}
      <div className="flex-1 flex flex-col border-r">
        <div className="p-2 flex flex-wrap items-center gap-3 border-b">
          <div className="text-sm font-semibold">Food Map (NYU · Bobst Library)</div>

          <label className="text-sm">Radius (m)</label>
          <input
            className="border rounded px-2 py-1 w-24"
            type="number" min={200} max={3000}
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
                      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                    )
                  }
                />
                {t}
              </label>
            ))}
          </div>

          {loading && <span className="text-xs text-gray-500">Loading…</span>}
          {data && <span className="text-xs text-gray-500">{items.length} spots</span>}
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

            {/* Bobst pin */}
            <Marker position={[BOBST.lat, BOBST.lon]} icon={L.divIcon({
              html: `
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z" fill="#6b21a8"/>
                  <path d="M7.5 8.2h9v.8h-9z" fill="white"/>
                </svg>`,
              iconSize: [30, 30], className: ""
            })}>
              <Popup>Elmer Holmes Bobst Library (NYU)</Popup>
              <Tooltip direction="top" offset={[0, -18]} opacity={1} permanent>
                Bobst Library
              </Tooltip>
            </Marker>

            <Circle center={[BOBST.lat, BOBST.lon]} radius={80} color="#6b21a8" fillColor="#c4b5fd" fillOpacity={0.25} />
            <Circle center={[BOBST.lat, BOBST.lon]} radius={radius} color="#6b21a8" fillOpacity={0} dashArray="6 6" />

            {items.map((p) => (
              <Marker
                key={p.id}
                position={[p.lat, p.lon]}
                icon={markerIcon(p.score, p.id === activeId)}
                ref={(m) => { if (m) markersRef.current.set(p.id, m); }}
                eventHandlers={{ click: () => setActiveId(p.id) }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">{p.name}</div>
                    {p.categories?.length ? <div className="text-xs">{p.categories.join(", ")}</div> : null}
                    {p.address && <div className="text-xs">{p.address}</div>}
                    <div className="text-xs">Score: {Math.floor((p.score || 0) * 100)}/100</div>
                    {typeof p.rating === "number" && (
                      <div className="text-xs">Rating: {p.rating.toFixed(1)}/5 ({p.review_count ?? 0})</div>
                    )}
                    {typeof p.price === "number" && <div className="text-xs">Price: {"$".repeat(p.price)}</div>}
                    <div className="flex gap-2 pt-1">
                      {p.website && <a className="text-blue-600 underline text-xs" href={p.website} target="_blank" rel="noreferrer">Yelp Page</a>}
                      {p.phone && <a className="text-blue-600 underline text-xs" href={`tel:${p.phone}`}>Call</a>}
                    </div>
                    <div className="text-[10px] text-gray-400 pt-1">Ratings & reviews data © Yelp</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <FlyToAndOpen
              target={activePlace}
              open={() => {
                const m = activePlace ? markersRef.current.get(activePlace.id) : null;
                m?.openPopup();
              }}
            />
          </MapContainer>
        </div>
      </div>

      {/* Right: list + search */}
      <aside className="w-full max-w-md shrink-0 flex flex-col">
        <div className="p-3 border-b bg-white/80 backdrop-blur">
          <div className="relative mb-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={onTermKeyDown}
              onFocus={() => suggests.length && setShowSuggests(true)}
              placeholder="Search (e.g., ramen, korean, pizza)"
              className="border rounded px-3 py-2 w-full text-sm"
            />
            {showSuggests && suggests.length > 0 && (
              <ul
                className="absolute z-[1000] mt-1 w-full bg-white border rounded shadow text-sm max-h-64 overflow-auto"
                onMouseLeave={() => setHighlightIdx(-1)}
              >
                {suggests.map((s, idx) => (
                  <li
                    key={`${s.type}-${s.text}-${s.id || idx}`}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                      idx === highlightIdx ? "bg-violet-50" : "hover:bg-gray-50"
                    }`}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onMouseDown={(e) => { e.preventDefault(); chooseSuggestion(s); }}
                  >
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600">
                      {s.type}
                    </span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label>Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="rating">Rating</option>
              <option value="review_count">Review count</option>
              <option value="distance">Distance</option>
              <option value="best_match">Best match</option>
            </select>

            <label className="ml-3">Min ⭐</label>
            <input
              type="number" min={0} max={5} step={0.1}
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="border rounded px-2 py-1 w-16"
            />

            <label className="ml-3">Min reviews</label>
            <input
              type="number" min={0} step={10}
              value={minReviews}
              onChange={(e) => setMinReviews(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {items.length === 0 && !loading && (
            <div className="p-4 text-sm text-gray-500">No results. Try widening radius or lowering filters.</div>
          )}
          <ul>
            {items.map((p, idx) => {
              const walk = metersToMinWalk(p.distance);
              const active = p.id === activeId;
              return (
                <li
                  key={p.id}
                  className={`px-4 py-3 border-b cursor-pointer ${active ? "bg-violet-50" : "bg-white hover:bg-gray-50"}`}
                  onClick={() => {
                    setActiveId(p.id);
                    const m = markersRef.current.get(p.id);
                    if (m) m.openPopup();
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xs text-gray-500 w-6 mt-[3px]">#{idx + 1}</div>
                    <div className="flex-1">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-600">
                        <Stars value={p.rating ?? 0} />{" "}
                        {typeof p.rating === "number" ? p.rating.toFixed(1) : "–"}/5
                        {p.review_count ? ` · ${p.review_count} reviews` : ""}
                        {p.price ? ` · ${"$".repeat(p.price)}` : ""}
                        {walk ? ` · ${walk} min walk` : ""}
                      </div>
                      {p.categories?.length ? (
                        <div className="text-[11px] text-gray-500">{p.categories.join(", ")}</div>
                      ) : null}
                      {p.address && <div className="text-[11px] text-gray-500">{p.address}</div>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

