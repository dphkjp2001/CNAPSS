// frontend/src/pages/food/FoodMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { fetchNearbyPlaces, fetchPlaceSuggestions } from "../../api/places";

// Simple center helper for panning after center changes
function PanTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.lat && center?.lon) {
      map.setView([center.lat, center.lon], map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

// A simple dot marker icon to avoid asset issues
const dotIcon = L.divIcon({
  className:
    "w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white shadow-[0_0_0_2px_rgba(244,63,94,0.35)]",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function FoodMap() {
  const { token } = useAuth();
  const { school } = useSchool();

  // Server-driven center/radius/items (server returns center per-school)
  const [center, setCenter] = useState({ lat: 40.729513, lon: -73.997649 }); // NYU Bobst fallback
  const [radius, setRadius] = useState(1200);

  // Filters
  const [types, setTypes] = useState(["restaurant", "cafe", "fast food"]);
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState("best_match"); // rating | review_count | distance | best_match

  // Search term and address toggle
  const [term, setTerm] = useState("");
  const [useAddress, setUseAddress] = useState(false); // when true, server geocodes 'address' first

  // Data / UI states
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  // Suggestions (typeahead)
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef(null);

  const SCHOOL_LABEL = useMemo(() => String(school || "").toUpperCase(), [school]);

  // Guard: require auth
  if (!token) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
          Please log in to use Food Map.
        </div>
      </div>
    );
  }

  // Load places whenever key inputs change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        setUnavailable(false);

        const res = await fetchNearbyPlaces({
          school,
          token,
          ...(useAddress ? { address: term } : { term }),
          radius,
          types,
          minRating,
          minReviews,
          sortBy,
        });

        if (cancelled) return;
        setCenter(res.center || center);
        setItems(Array.isArray(res.items) ? res.items : []);
        if (!activeId && res.items?.length) setActiveId(res.items[0].id);
      } catch (err) {
        if (cancelled) return;
        // Our API helper throws { code: "FEATURE_UNAVAILABLE" } for 501
        if (err && err.code === "FEATURE_UNAVAILABLE") {
          setUnavailable(true);
          setItems([]);
        } else {
          setErrorMsg("Failed to load places.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, token, radius, types.join("|"), minRating, minReviews, sortBy, term, useAddress]);

  // Typeahead suggestions for address/keyword
  useEffect(() => {
    let timer;
    const q = term.trim();
    if (q.length >= 2) {
      timer = setTimeout(async () => {
        try {
          const { suggestions } = await fetchPlaceSuggestions({
            school,
            token,
            text: q,
            lat: center.lat,
            lon: center.lon,
            limit: 8,
          });
          setSuggests(suggestions || []);
          setShowSuggests(true);
          setHighlightIdx(-1);
        } catch {
          setSuggests([]);
          setShowSuggests(false);
        }
      }, 220);
    } else {
      setSuggests([]);
      setShowSuggests(false);
    }
    return () => clearTimeout(timer);
  }, [term, school, token, center]);

  const activeItem = useMemo(
    () => items.find((x) => x.id === activeId) || null,
    [items, activeId]
  );

  const onPickSuggest = (s) => {
    setTerm(s.text || "");
    setShowSuggests(false);
    // If user is in address mode, keep it; otherwise leave as keyword.
    // We could auto-enable address for business/category terms, but keep behavior predictable.
  };

  const toggleType = (t) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left: Map */}
      <div className="relative flex-1">
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <PanTo center={center} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* School anchor marker and radius rings */}
          <Marker
            position={[center.lat, center.lon]}
            icon={L.divIcon({
              className:
                "flex items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-lg",
              html: '<div style="width:18px;height:18px;border-radius:9999px"></div>',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
              {SCHOOL_LABEL}
            </Tooltip>
            <Popup>Center • {SCHOOL_LABEL}</Popup>
          </Marker>
          <Circle
            center={[center.lat, center.lon]}
            radius={80}
            color="#6b21a8"
            fillColor="#c4b5fd"
            fillOpacity={0.25}
          />
          <Circle
            center={[center.lat, center.lon]}
            radius={radius}
            color="#6b21a8"
            fillOpacity={0}
            dashArray="6 6"
          />

          {/* Result markers */}
          {items.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lon]}
              icon={dotIcon}
              eventHandlers={{
                click: () => setActiveId(p.id),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-gray-600">{p.address || "-"}</div>
                  <div className="mt-1 text-gray-600">
                    ⭐ {p.rating ?? "-"} · {p.review_count ?? 0} reviews
                  </div>
                  {p.price ? (
                    <div className="text-gray-600">{"$".repeat(p.price)}</div>
                  ) : null}
                  {p.website ? (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-indigo-600 underline"
                    >
                      Yelp
                    </a>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Top-left controls */}
        <div className="pointer-events-auto absolute left-3 top-3 w-[min(560px,95%)] rounded-xl border border-gray-200 bg-white/95 p-3 shadow-md backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Food Map ({SCHOOL_LABEL})</div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={useAddress}
                  onChange={(e) => setUseAddress(e.target.checked)}
                />
                by address
              </label>
              <div className="flex items-center gap-1">
                <span>Radius</span>
                <select
                  className="rounded border px-1 py-0.5"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                >
                  {[600, 800, 1000, 1200, 1500, 2000].map((r) => (
                    <option key={r} value={r}>
                      {r} m
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Search bar + suggestions */}
          <div className="relative">
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={
                useAddress
                  ? "Search by address or place (e.g., 'Washington Square Park')"
                  : "Search keyword (e.g., ramen, coffee)"
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              onKeyDown={(e) => {
                if (!showSuggests || suggests.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIdx((v) => Math.min(v + 1, suggests.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIdx((v) => Math.max(v - 1, 0));
                } else if (e.key === "Enter" && highlightIdx >= 0) {
                  e.preventDefault();
                  onPickSuggest(suggests[highlightIdx]);
                }
              }}
            />
            {showSuggests && suggests.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow">
                {suggests.map((s, i) => (
                  <button
                    key={`${s.type}-${s.text}-${i}`}
                    onClick={() => onPickSuggest(s)}
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      i === highlightIdx ? "bg-gray-100" : ""
                    }`}
                    onMouseEnter={() => setHighlightIdx(i)}
                  >
                    <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                      {s.type}
                    </span>
                    {s.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick filters */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-600">Types:</span>
            {["restaurant", "cafe", "fast food"].map((t) => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`rounded-full px-2 py-1 ${
                    on
                      ? "bg-gray-900 text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t}
                </button>
              );
            })}
            <span className="ml-2 text-gray-600">Min ⭐</span>
            <select
              className="rounded border px-1 py-0.5"
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
            >
              {[0, 3.5, 4.0, 4.5].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="ml-2 text-gray-600">Min reviews</span>
            <select
              className="rounded border px-1 py-0.5"
              value={minReviews}
              onChange={(e) => setMinReviews(parseInt(e.target.value, 10))}
            >
              {[0, 20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="ml-2 text-gray-600">Sort</span>
            <select
              className="rounded border px-1 py-0.5"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="best_match">best match</option>
              <option value="rating">rating</option>
              <option value="review_count">review count</option>
              <option value="distance">distance</option>
            </select>
          </div>
        </div>

        {/* Bottom-left status */}
        <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg bg-white/90 px-3 py-1 text-xs text-gray-700 shadow">
          {loading ? "Loading…" : `${items.length} places`}
          {errorMsg && <span className="ml-2 text-red-600">{errorMsg}</span>}
          {unavailable && (
            <span className="ml-2">
              Feature not available for <b>{SCHOOL_LABEL}</b> yet.
            </span>
          )}
        </div>
      </div>

      {/* Right: List */}
      <div className="w-[380px] border-l bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Results</div>
          <div className="text-xs text-gray-500">{items.length}</div>
        </div>

        <div className="flex-1 overflow-auto">
          {unavailable ? (
            <div className="p-4 text-sm text-gray-700">
              This feature is not available for <b>{SCHOOL_LABEL}</b> yet.
            </div>
          ) : !loading && items.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              No results. Try widening radius or changing filters.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((p) => {
                const on = activeId === p.id;
                return (
                  <li
                    key={p.id}
                    className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${
                      on ? "bg-indigo-50" : ""
                    }`}
                    onClick={() => setActiveId(p.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-600">
                          {p.categories?.join(" • ") || "-"}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          ⭐ {p.rating ?? "-"} · {p.review_count ?? 0} reviews
                          {p.price ? <span> · {"$".repeat(p.price)}</span> : null}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {p.address || "-"}
                        </div>
                      </div>
                      {p.website ? (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-3 rounded bg-gray-900 px-2 py-1 text-xs text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Yelp
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


