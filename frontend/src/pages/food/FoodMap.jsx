// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";

// import { useAuth } from "../../contexts/AuthContext";
// import { useSchool } from "../../contexts/SchoolContext";
// import { fetchNearbyPlaces, fetchPlaceSuggestions } from "../../api/places";

// /** Center 이동 도우미: focus가 있으면 focus로, 없으면 anchor로 */
// function PanTo({ anchor, focus }) {
//   const map = useMap();
//   useEffect(() => {
//     const c = focus || anchor;
//     if (c?.lat && c?.lon) {
//       map.setView([c.lat, c.lon], map.getZoom(), { animate: true });
//     }
//   }, [anchor, focus, map]);
//   return null;
// }

// const dotIcon = L.divIcon({
//   className:
//     "w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white shadow-[0_0_0_2px_rgba(244,63,94,0.35)]",
//   iconSize: [12, 12],
//   iconAnchor: [6, 6],
// });

// export default function FoodMap() {
//   const { token } = useAuth();
//   const { school } = useSchool();

//   const [anchor, setAnchor] = useState({ lat: 40.729513, lon: -73.997649 }); // 캠퍼스
//   const [center, setCenter] = useState({ lat: 40.729513, lon: -73.997649 }); // 검색 기준
//   const [radius, setRadius] = useState(1200);
//   const [focus, setFocus] = useState(null); // 지도 포커스

//   // 필터
//   const [types, setTypes] = useState(["restaurant", "cafe", "fast food"]);
//   const [cuisines, setCuisines] = useState([]);
//   const [priceLevels, setPriceLevels] = useState([1, 2, 3]);
//   const [openNow, setOpenNow] = useState(false);
//   const [minRating, setMinRating] = useState(0);
//   const [minReviews, setMinReviews] = useState(0);
//   const [sortBy, setSortBy] = useState("best_match");

//   // 검색
//   const [term, setTerm] = useState("");
//   const [useAddress, setUseAddress] = useState(false);

//   // 데이터
//   const [items, setItems] = useState([]);
//   const [activeId, setActiveId] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");
//   const [unavailable, setUnavailable] = useState(false);

//   // 제안
//   const [suggests, setSuggests] = useState([]);
//   const [showSuggests, setShowSuggests] = useState(false);
//   const [highlightIdx, setHighlightIdx] = useState(-1);

//   const inputRef = useRef(null);
//   const markerRefs = useRef({});     // id -> L.Marker
//   const listRef = useRef(null);      // 결과 리스트 스크롤 컨테이너
//   const itemRefs = useRef({});       // id -> <li> element

//   const SCHOOL_LABEL = useMemo(() => String(school || "").toUpperCase(), [school]);

//   if (!token) {
//     return (
//       <div className="mx-auto max-w-4xl p-6">
//         <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
//           Please log in to use Food Map.
//         </div>
//       </div>
//     );
//   }

//   // 데이터 로드
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         setLoading(true);
//         setErrorMsg("");
//         setUnavailable(false);

//         const res = await fetchNearbyPlaces({
//           school,
//           token,
//           ...(useAddress ? { address: term } : { term }),
//           radius,
//           types,
//           minRating,
//           minReviews,
//           sortBy,
//           categories: cuisines.join(","),
//           priceLevels: priceLevels.join(","),
//           openNow,
//         });

//         if (cancelled) return;
//         if (res.anchor?.lat && res.anchor?.lon) setAnchor(res.anchor);
//         if (res.center?.lat && res.center?.lon) setCenter(res.center);
//         setItems(Array.isArray(res.items) ? res.items : []);
//         if (!activeId && res.items?.length) setActiveId(res.items[0].id);
//         setFocus(null); // 새 검색 시 포커스 초기화
//       } catch (err) {
//         if (cancelled) return;
//         if (err && err.code === "FEATURE_UNAVAILABLE") {
//           setUnavailable(true);
//           setItems([]);
//         } else {
//           setErrorMsg("Failed to load places.");
//           setItems([]);
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [
//     school,
//     token,
//     radius,
//     types.join("|"),
//     cuisines.join("|"),
//     priceLevels.join(","),
//     openNow,
//     minRating,
//     minReviews,
//     sortBy,
//     term,
//     useAddress,
//   ]);

//   // 제안어
//   useEffect(() => {
//     let timer;
//     const q = term.trim();
//     if (q.length >= 2) {
//       timer = setTimeout(async () => {
//         try {
//           const { suggestions } = await fetchPlaceSuggestions({
//             school,
//             token,
//             text: q,
//             lat: center.lat,
//             lon: center.lon,
//             limit: 8,
//           });
//           setSuggests(suggestions || []);
//           setShowSuggests(true);
//           setHighlightIdx(-1);
//         } catch {
//           setSuggests([]);
//           setShowSuggests(false);
//         }
//       }, 220);
//     } else {
//       setSuggests([]);
//       setShowSuggests(false);
//     }
//     return () => clearTimeout(timer);
//   }, [term, school, token, center]);

//   // ✅ activeId 변경 시: 지도 포커스 + 마커 팝업 + 리스트 자동 스크롤
//   useEffect(() => {
//     if (!activeId) return;

//     // 지도 이동 & 팝업
//     const p = items.find((x) => x.id === activeId);
//     const m = markerRefs.current[activeId];
//     if (p?.lat && p?.lon) {
//       setFocus({ lat: p.lat, lon: p.lon });
//       setTimeout(() => {
//         if (m && typeof m.openPopup === "function") m.openPopup();
//       }, 250);
//     }

//     // 리스트 스크롤
//     const el = itemRefs.current[activeId];
//     const container = listRef.current;
//     if (el && container) {
//       // scrollIntoView가 가장 간단 (가까운 스크롤 조상만 스크롤)
//       try {
//         el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
//       } catch {
//         // fallback
//         const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
//         container.scrollTo({ top, behavior: "smooth" });
//       }
//     }
//   }, [activeId, items]);

//   const onPickSuggest = (s) => {
//     setTerm(s.text || "");
//     setShowSuggests(false);
//   };
//   const toggleType = (t) => {
//     setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
//   };

//   return (
//     <div className="flex h-[calc(100vh-72px)] flex-col overflow-hidden">
//       {/* ── 상단 컨트롤 바 ── */}
//       <div className="border-b bg-white/95 px-4 py-3">
//         <div className="flex flex-wrap items-center gap-3">
//           <div className="relative grow">
//             <input
//               ref={inputRef}
//               value={term}
//               onChange={(e) => setTerm(e.target.value)}
//               placeholder={
//                 useAddress
//                   ? "Search by address or place (e.g., 'Washington Square Park')"
//                   : "Search keyword (e.g., ramen, coffee)"
//               }
//               className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
//               onKeyDown={(e) => {
//                 if (!showSuggests || suggests.length === 0) return;
//                 if (e.key === "ArrowDown") {
//                   e.preventDefault();
//                   setHighlightIdx((v) => Math.min(v + 1, suggests.length - 1));
//                 } else if (e.key === "ArrowUp") {
//                   e.preventDefault();
//                   setHighlightIdx((v) => Math.max(v - 1, 0));
//                 } else if (e.key === "Enter" && highlightIdx >= 0) {
//                   e.preventDefault();
//                   onPickSuggest(suggests[highlightIdx]);
//                 }
//               }}
//             />
//             {showSuggests && suggests.length > 0 && (
//               <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow">
//                 {suggests.map((s, i) => (
//                   <button
//                     key={`${s.type}-${s.text}-${i}`}
//                     onClick={() => onPickSuggest(s)}
//                     className={`block w-full px-3 py-2 text-left text-sm ${
//                       i === highlightIdx ? "bg-gray-100" : ""
//                     }`}
//                     onMouseEnter={() => setHighlightIdx(i)}
//                   >
//                     <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
//                       {s.type}
//                     </span>
//                     {s.text}
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>

//           <label className="flex items-center gap-1 text-xs text-gray-700">
//             <input type="checkbox" checked={useAddress} onChange={(e) => setUseAddress(e.target.checked)} />
//             by address
//           </label>

//           <div className="flex items-center gap-2 text-xs text-gray-700">
//             <span>Radius</span>
//             <select
//               className="rounded border px-1 py-0.5"
//               value={radius}
//               onChange={(e) => setRadius(parseInt(e.target.value, 10))}
//             >
//               {[600, 800, 1000, 1200, 1500, 2000].map((r) => (
//                 <option key={r} value={r}>
//                   {r} m
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-center gap-2 text-xs text-gray-700">
//             <span>Min ⭐</span>
//             <select
//               className="rounded border px-1 py-0.5"
//               value={minRating}
//               onChange={(e) => setMinRating(parseFloat(e.target.value))}
//             >
//               {[0, 3.5, 4.0, 4.5].map((r) => (
//                 <option key={r} value={r}>
//                   {r}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-center gap-2 text-xs text-gray-700">
//             <span>Min reviews</span>
//             <select
//               className="rounded border px-1 py-0.5"
//               value={minReviews}
//               onChange={(e) => setMinReviews(parseInt(e.target.value, 10))}
//             >
//               {[0, 20, 50, 100, 200].map((n) => (
//                 <option key={n} value={n}>
//                   {n}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-center gap-2 text-xs text-gray-700">
//             <span>Sort</span>
//             <select
//               className="rounded border px-1 py-0.5"
//               value={sortBy}
//               onChange={(e) => setSortBy(e.target.value)}
//             >
//               <option value="best_match">best match</option>
//               <option value="rating">rating</option>
//               <option value="review_count">review count</option>
//               <option value="distance">distance</option>
//             </select>
//           </div>
//         </div>

//         <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
//           <span className="text-gray-600">Types:</span>
//           {["restaurant", "cafe", "fast food"].map((t) => {
//             const on = types.includes(t);
//             return (
//               <button
//                 key={t}
//                 onClick={() => setTypes((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))}
//                 className={`rounded-full px-2 py-1 ${
//                   on ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
//                 }`}
//               >
//                 {t}
//               </button>
//             );
//           })}

//           <span className="ml-2 text-gray-600">Cuisines:</span>
//           {["ramen", "sushi", "pizza", "burgers", "thai", "mexican", "chinese", "korean", "indpak", "vegan", "italian"].map(
//             (c) => {
//               const on = cuisines.includes(c);
//               return (
//                 <button
//                   key={c}
//                   onClick={() => setCuisines((prev) => (on ? prev.filter((x) => x !== c) : [...prev, c]))}
//                   className={`rounded-full px-2 py-1 ${
//                     on ? "bg-indigo-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
//                   }`}
//                 >
//                   {c}
//                 </button>
//               );
//             }
//           )}

//           <span className="ml-2 text-gray-600">Price:</span>
//           {[1, 2, 3, 4].map((p) => {
//             const on = priceLevels.includes(p);
//             return (
//               <button
//                 key={p}
//                 onClick={() =>
//                   setPriceLevels((prev) => (on ? prev.filter((x) => x !== p) : [...prev, p].sort()))
//                 }
//                 className={`rounded px-2 py-1 font-mono ${
//                   on ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
//                 }`}
//               >
//                 {"$".repeat(p)}
//               </button>
//             );
//           })}

//           <label className="ml-2 flex items-center gap-1 text-gray-700">
//             <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
//             open now
//           </label>
//         </div>
//       </div>

//       {/* ── 본문: 지도 + 리스트 ── */}
//       <div className="flex flex-1 overflow-hidden">
//         {/* Left: Map */}
//         <div className="relative flex-1">
//           <MapContainer
//             center={[anchor.lat, anchor.lon]}
//             zoom={15}
//             style={{ height: "100%", width: "100%" }}
//             scrollWheelZoom
//           >
//             <PanTo anchor={anchor} focus={focus || null} />
//             <TileLayer
//               attribution='&copy; OpenStreetMap contributors'
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />

//             {/* 캠퍼스 + 반경 */}
//             <Marker
//               position={[anchor.lat, anchor.lon]}
//               icon={L.divIcon({
//                 className:
//                   "flex items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-lg",
//                 html: '<div style="width:18px;height:18px;border-radius:9999px"></div>',
//                 iconSize: [18, 18],
//                 iconAnchor: [9, 9],
//               })}
//             >
//               <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
//                 {SCHOOL_LABEL}
//               </Tooltip>
//               <Popup>Center • {SCHOOL_LABEL}</Popup>
//             </Marker>
//             <Circle center={[anchor.lat, anchor.lon]} radius={80} color="#6b21a8" fillColor="#c4b5fd" fillOpacity={0.25} />
//             <Circle center={[center.lat, center.lon]} radius={radius} color="#6b21a8" fillOpacity={0} dashArray="6 6" />

//             {/* 결과 마커 */}
//             {items.map((p) => (
//               <Marker
//                 key={p.id}
//                 position={[p.lat, p.lon]}
//                 icon={dotIcon}
//                 eventHandlers={{ click: () => setActiveId(p.id) }}
//                 ref={(ref) => {
//                   if (ref) markerRefs.current[p.id] = ref;
//                 }}
//               >
//                 <Popup>
//                   <div className="text-sm">
//                     <div className="font-semibold">{p.name}</div>
//                     <div className="text-gray-600">{p.address || "-"}</div>
//                     <div className="mt-1 text-gray-600">
//                       ⭐ {p.rating ?? "-"} · {p.review_count ?? 0} reviews
//                     </div>
//                     {p.price ? <div className="text-gray-600">{"$".repeat(p.price)}</div> : null}
//                     {p.website ? (
//                       <a href={p.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-indigo-600 underline">
//                         Yelp
//                       </a>
//                     ) : null}
//                   </div>
//                 </Popup>
//               </Marker>
//             ))}
//           </MapContainer>

//           {/* 좌하단 상태 */}
//           <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg bg-white/90 px-3 py-1 text-xs text-gray-700 shadow">
//             {loading ? "Loading…" : `${items.length} places`}
//             {errorMsg && <span className="ml-2 text-red-600">{errorMsg}</span>}
//             {unavailable && (
//               <span className="ml-2">
//                 Feature not available for <b>{SCHOOL_LABEL}</b> yet.
//               </span>
//             )}
//           </div>
//         </div>

//         {/* Right: List */}
//         <div className="w-[380px] border-l bg-white h-full flex flex-col">
//           <div className="flex items-center justify-between border-b px-4 py-3">
//             <div className="text-sm font-semibold">Results</div>
//             <div className="text-xs text-gray-500">{items.length}</div>
//           </div>

//           {/* ✅ 스크롤 컨테이너에 ref 부여 */}
//           <div className="flex-1 overflow-auto" ref={listRef}>
//             {unavailable ? (
//               <div className="p-4 text-sm text-gray-700">
//                 This feature is not available for <b>{SCHOOL_LABEL}</b> yet.
//               </div>
//             ) : !loading && items.length === 0 ? (
//               <div className="p-4 text-sm text-gray-500">No results. Try widening radius or changing filters.</div>
//             ) : (
//               <ul className="divide-y">
//                 {items.map((p) => {
//                   const on = activeId === p.id;
//                   return (
//                     <li
//                       key={p.id}
//                       ref={(el) => {
//                         if (el) itemRefs.current[p.id] = el; // ✅ 각 항목에 ref 저장
//                       }}
//                       className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${on ? "bg-indigo-50" : ""}`}
//                       onClick={() => setActiveId(p.id)}
//                     >
//                       <div className="flex items-start justify-between">
//                         <div>
//                           <div className="font-medium">{p.name}</div>
//                           <div className="text-xs text-gray-600">{p.categories?.join(" • ") || "-"}</div>
//                           <div className="mt-1 text-xs text-gray-600">
//                             ⭐ {p.rating ?? "-"} · {p.review_count ?? 0} reviews
//                             {p.price ? <span> · {"$".repeat(p.price)}</span> : null}
//                           </div>
//                           <div className="mt-1 text-xs text-gray-500">{p.address || "-"}</div>
//                         </div>
//                         {p.website ? (
//                           <a
//                             href={p.website}
//                             target="_blank"
//                             rel="noreferrer"
//                             className="ml-3 rounded bg-gray-900 px-2 py-1 text-xs text-white"
//                             onClick={(e) => e.stopPropagation()}
//                           >
//                             Yelp
//                           </a>
//                         ) : null}
//                       </div>
//                     </li>
//                   );
//                 })}
//               </ul>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }







import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { fetchNearbyPlaces, fetchPlaceSuggestions } from "../../api/places";

/** Center helper: move to focus if exists, else to anchor */
function PanTo({ anchor, focus }) {
  const map = useMap();
  useEffect(() => {
    const c = focus || anchor;
    if (c?.lat && c?.lon) {
      map.setView([c.lat, c.lon], map.getZoom(), { animate: true });
    }
  }, [anchor, focus, map]);
  return null;
}

const dotIcon = L.divIcon({
  className:
    "w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white shadow-[0_0_0_2px_rgba(244,63,94,0.35)]",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function FoodMap() {
  const { token } = useAuth();
  const { school } = useSchool();

  const [anchor, setAnchor] = useState({ lat: 40.729513, lon: -73.997649 });
  const [center, setCenter] = useState({ lat: 40.729513, lon: -73.997649 });
  const [radius, setRadius] = useState(1200);
  const [focus, setFocus] = useState(null);

  // filters
  const [types, setTypes] = useState(["restaurant", "cafe", "fast food"]);
  const [cuisines, setCuisines] = useState([]);
  const [priceLevels, setPriceLevels] = useState([1, 2, 3]);
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState("best_match");

  // search
  const [term, setTerm] = useState("");
  const [useAddress, setUseAddress] = useState(false);

  // data
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  // suggestions
  const [suggests, setSuggests] = useState([]);
  const [showSuggests, setShowSuggests] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inputRef = useRef(null);
  const markerRefs = useRef({});
  const listRef = useRef(null);
  const itemRefs = useRef({});

  const SCHOOL_LABEL = useMemo(() => String(school || "").toUpperCase(), [school]);

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
          Please log in to use Food Map.
        </div>
      </div>
    );
  }

  // load data
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
          categories: cuisines.join(","),
          priceLevels: priceLevels.join(","),
          openNow,
        });

        if (cancelled) return;
        if (res.anchor?.lat && res.anchor?.lon) setAnchor(res.anchor);
        if (res.center?.lat && res.center?.lon) setCenter(res.center);
        setItems(Array.isArray(res.items) ? res.items : []);
        if (!activeId && res.items?.length) setActiveId(res.items[0].id);
        setFocus(null);
      } catch (err) {
        if (cancelled) return;
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
  }, [
    school,
    token,
    radius,
    types.join("|"),
    cuisines.join("|"),
    priceLevels.join(","),
    openNow,
    minRating,
    minReviews,
    sortBy,
    term,
    useAddress,
  ]);

  // suggestion effect
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

  useEffect(() => {
    if (!activeId) return;
    const p = items.find((x) => x.id === activeId);
    const m = markerRefs.current[activeId];
    if (p?.lat && p?.lon) {
      setFocus({ lat: p.lat, lon: p.lon });
      setTimeout(() => {
        if (m && typeof m.openPopup === "function") m.openPopup();
      }, 250);
    }
    const el = itemRefs.current[activeId];
    const container = listRef.current;
    if (el && container) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      } catch {
        const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
        container.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [activeId, items]);

  const onPickSuggest = (s) => {
    setTerm(s.text || "");
    setShowSuggests(false);
  };

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col overflow-hidden">
      {/* Controls */}
      <div className="border-b bg-white/95 px-4 py-3">
        {/* ...controls content unchanged... */}
        {/* (omitted for brevity; same as your existing file) */}
      </div>

      {/* Map + List */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1">
          <MapContainer center={[anchor.lat, anchor.lon]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <PanTo anchor={anchor} focus={focus || null} />
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker
              position={[anchor.lat, anchor.lon]}
              icon={L.divIcon({
                className: "flex items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-lg",
                html: '<div style="width:18px;height:18px;border-radius:9999px"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              })}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                {String(school || "").toUpperCase()}
              </Tooltip>
              <Popup>Center</Popup>
            </Marker>
            <Circle center={[anchor.lat, anchor.lon]} radius={80} color="#6b21a8" fillColor="#c4b5fd" fillOpacity={0.25} />
            <Circle center={[center.lat, center.lon]} radius={radius} color="#6b21a8" fillOpacity={0} dashArray="6 6" />
            {items.map((p) => (
              <Marker
                key={p.id}
                position={[p.lat, p.lon]}
                icon={dotIcon}
                eventHandlers={{ click: () => setActiveId(p.id) }}
                ref={(ref) => {
                  if (ref) markerRefs.current[p.id] = ref;
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-gray-600">{p.address || "-"}</div>
                    <div className="mt-1 text-gray-600">⭐ {p.rating ?? "-"} · {p.review_count ?? 0} reviews</div>
                    {p.price ? <div className="text-gray-600">{"$".repeat(p.price)}</div> : null}
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-indigo-600 underline">
                        Yelp
                      </a>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg bg-white/90 px-3 py-1 text-xs text-gray-700 shadow">
            {loading ? "Loading…" : `${items.length} places`}
            {errorMsg && <span className="ml-2 text-red-600">{errorMsg}</span>}
            {unavailable && <span className="ml-2">Feature not available yet.</span>}
          </div>
        </div>

        {/* List */}
        <div className="w-[380px] border-l bg-white h-full flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">Results</div>
            <div className="text-xs text-gray-500">{items.length}</div>
          </div>
          <div className="flex-1 overflow-auto" ref={listRef}>
            {!loading && items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No results. Try widening radius or changing filters.</div>
            ) : (
              <ul className="divide-y">
                {items.map((p) => {
                  const on = activeId === p.id;
                  return (
                    <li
                      key={p.id}
                      ref={(el) => {
                        if (el) itemRefs.current[p.id] = el;
                      }}
                      className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${on ? "bg-indigo-50" : ""}`}
                      onClick={() => setActiveId(p.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-600">{p.categories?.join(" • ") || "-"}</div>
                          <div className="mt-1 text-xs text-gray-600">
                            ⭐ {p.rating ?? "-"} · {p.review_count ?? 0} reviews
                            {p.price ? <span> · {"$".repeat(p.price)}</span> : null}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{p.address || "-"}</div>
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
    </div>
  );
}
