// // frontend/src/pages/dashboard/Dashboard.jsx
// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import "dayjs/locale/en";

// import { useAuth } from "../../contexts/AuthContext";
// import { useSchool } from "../../contexts/SchoolContext";
// import { useSchoolPath } from "../../utils/schoolPath";
// import { useLoginGate } from "../../hooks/useLoginGate";

// import { listPosts, getPublicPosts } from "../../api/posts";
// import { listRecentMaterials } from "../../api/materials";
// import { listItems as listMarketItems, getPublicMarketRecent } from "../../api/market";

// dayjs.extend(relativeTime);
// dayjs.locale("en");

// const materialTypeLabel = (t) => {
//   switch (t) {
//     case "personalMaterial":
//       return "personal material";
//     case "personalClassNote":
//       return "personal class note";
//     default:
//       return t || "material";
//   }
// };

// const currency = new Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
// });

// export default function Dashboard() {
//   const { token } = useAuth();
//   const { school, schoolTheme } = useSchool();
//   const { ensureAuth } = useLoginGate();
//   const nav = useNavigate();
//   const schoolPath = useSchoolPath();

//   /* ================= Free Board (list view) ================= */
//   const [posts, setPosts] = useState([]);
//   const [loadingPosts, setLoadingPosts] = useState(true);
//   const [errorPosts, setErrorPosts] = useState("");

//   useEffect(() => {
//     let alive = true;
//     if (!school) return;
//     (async () => {
//       setLoadingPosts(true);
//       setErrorPosts("");
//       try {
//         let data;
//         if (token) data = await listPosts({ school, token });
//         else data = await getPublicPosts({ school, page: 1, limit: 10 });
//         const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
//         if (alive) setPosts(rows.slice(0, 5));
//       } catch {
//         if (alive) setErrorPosts("Failed to load posts.");
//       } finally {
//         if (alive) setLoadingPosts(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [school, token]);

//   /* ================= CourseHub (For Sale / Wanted) ================= */
//   const [recentSale, setRecentSale] = useState([]);
//   const [recentWanted, setRecentWanted] = useState([]);
//   const [loadingCH, setLoadingCH] = useState(true);
//   const [errorCH, setErrorCH] = useState("");

//   useEffect(() => {
//     let alive = true;
//     if (!school) return;
//     (async () => {
//       setLoadingCH(true);
//       setErrorCH("");
//       try {
//         const sale = await listRecentMaterials({ school, token, limit: 5, type: "sale" });
//         const saleRows = Array.isArray(sale?.items) ? sale.items : Array.isArray(sale) ? sale : [];
//         const wanted = await listRecentMaterials({ school, token, limit: 5, type: "wanted" });
//         const wantedRows = Array.isArray(wanted?.items) ? wanted.items : Array.isArray(wanted) ? wanted : [];
//         if (!alive) return;
//         setRecentSale(saleRows);
//         setRecentWanted(wantedRows);
//       } catch {
//         if (alive) setErrorCH("Failed to load CourseHub items.");
//       } finally {
//         if (alive) setLoadingCH(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [school, token]);

//   /* ================= Marketplace (latest 5 with thumbnails) ================= */
//   const [mktItems, setMktItems] = useState([]);
//   const [loadingMkt, setLoadingMkt] = useState(true);
//   const [errorMkt, setErrorMkt] = useState("");

//   useEffect(() => {
//     let alive = true;
//     if (!school) return;
//     (async () => {
//       try {
//         setLoadingMkt(true);
//         setErrorMkt("");

//         let rows = [];
//         if (token) {
//           const res = await listMarketItems({ school, token, page: 1, limit: 5, sort: "latest" });
//           if (res && typeof res === "object" && Array.isArray(res.items)) {
//             rows = res.items;
//           } else if (Array.isArray(res)) {
//             const sorted = [...res].sort((a, b) =>
//               String(b.createdAt ?? b._id ?? "").localeCompare(String(a.createdAt ?? a._id ?? ""))
//             );
//             rows = sorted.slice(0, 5);
//           }
//         } else {
//           const res = await getPublicMarketRecent({ school, limit: 5 });
//           rows = res?.items || [];
//         }

//         if (!alive) return;
//         setMktItems(rows);
//       } catch {
//         if (alive) setErrorMkt("Failed to load marketplace items.");
//       } finally {
//         if (alive) setLoadingMkt(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [school, token]);

//   const headerColor = { color: schoolTheme?.text || "#4c1d95" };
//   const primaryBtn = { backgroundColor: schoolTheme?.primary || "#6b46c1" };

//   return (
//     <div
//       className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"
//       style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
//     >
//       <div className="mx-auto w-full max-w-6xl space-y-6">
//         {/* ===== CourseHub (2 columns) ===== */}
//         <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
//           <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//             <h2
//               onClick={() => nav(schoolPath("/courses"))}
//               className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
//               style={headerColor}
//             >
//               CourseHub
//             </h2>

//             {/* 작성 버튼만 유지 */}
//             <div className="flex w-full justify-end sm:w-auto">
//               <button
//                 onClick={() => ensureAuth(() => nav(schoolPath("/courses/write")))}
//                 className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
//                 style={primaryBtn}
//               >
//                 + Upload Post
//               </button>
//             </div>
//           </div>

//           {loadingCH ? (
//             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//               {Array.from({ length: 2 }).map((_, i) => (
//                 <div key={i} className="rounded-xl border p-4">
//                   <div className="mb-2 h-5 w-24 animate-pulse rounded bg-gray-100" />
//                   <ul className="divide-y divide-gray-100">
//                     {Array.from({ length: 5 }).map((__, j) => (
//                       <li key={j} className="py-3">
//                         <div className="flex items-center justify-between">
//                           <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
//                           <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
//                         </div>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               ))}
//             </div>
//           ) : errorCH ? (
//             <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorCH}</div>
//           ) : (
//             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//               <CourseHubList
//                 title="For Sale"
//                 items={recentSale}
//                 badgeClass="bg-emerald-100 text-emerald-700"
//                 onOpen={(id) => nav(schoolPath(`/courses/materials/${id}`))}
//               />
//               <CourseHubList
//                 title="Wanted"
//                 items={recentWanted}
//                 badgeClass="bg-rose-100 text-rose-700"
//                 onOpen={(id) => nav(schoolPath(`/courses/materials/${id}`))}
//               />
//             </div>
//           )}
//         </section>

//         {/* ===== Marketplace preview (latest 5) ===== */}
//         <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
//           <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//             <h2
//               onClick={() => nav(schoolPath("/market"))}
//               className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
//               style={headerColor}
//             >
//               Marketplace
//             </h2>

//             <div className="flex w-full justify-end sm:w-auto">
//               <button
//                 onClick={() => ensureAuth(() => nav(schoolPath("/market/write")))}
//                 className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto"
//                 style={primaryBtn}
//               >
//                 + Post an item
//               </button>
//             </div>
//           </div>

//           {loadingMkt ? (
//             <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
//               {Array.from({ length: 5 }).map((_, i) => (
//                 <div key={i} className="animate-pulse rounded-2xl border border-gray-200/60 bg-white shadow-sm">
//                   <div className="aspect-[4/3] w-full rounded-t-2xl bg-gray-100" />
//                   <div className="p-4 space-y-3">
//                     <div className="h-4 w-3/5 rounded bg-gray-100" />
//                     <div className="h-4 w-2/5 rounded bg-gray-100" />
//                     <div className="h-3 w-1/2 rounded bg-gray-100" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : errorMkt ? (
//             <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMkt}</div>
//           ) : mktItems.length === 0 ? (
//             <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
//               No listings yet.
//             </div>
//           ) : (
//             <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
//               {mktItems.map((item) => {
//                 const id = item._id || item.id;
//                 const thumb = item.images?.[0] || item.image || "";
//                 return (
//                   <button
//                     key={id}
//                     onClick={() => nav(schoolPath(`/market/${id}`))}
//                     className="group block overflow-hidden rounded-2xl border border-gray-200/60 bg-white text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/20"
//                   >
//                     <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
//                       {thumb ? (
//                         <img
//                           src={thumb}
//                           alt={item.title}
//                           className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
//                           loading="lazy"
//                         />
//                       ) : (
//                         <div className="flex h-full w-full items-center justify-center text-4xl">🖼️</div>
//                       )}
//                     </div>
//                     <div className="p-4">
//                       <h3 className="line-clamp-1 text-base font-semibold text-gray-900">
//                         {item.title}
//                       </h3>
//                       <p className="mt-1 text-sm font-medium text-gray-800">
//                         {currency.format(Number(item.price) || 0)}
//                       </p>
//                       <p className="mt-1 line-clamp-1 text-xs text-gray-500">
//                         {item.sellerNickname || "Unknown"}
//                       </p>
//                     </div>
//                   </button>
//                 );
//               })}
//             </div>
//           )}
//         </section>

//         {/* ===== Free Board (LIST view) ===== */}
//         <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
//           <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//             <h2
//               onClick={() => nav(schoolPath("/freeboard"))}
//               className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
//               style={headerColor}
//             >
//               Free Board
//             </h2>

//             <button
//               onClick={() => ensureAuth(() => nav(schoolPath("/freeboard/write")))}
//               className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto"
//               style={primaryBtn}
//             >
//               + Write Post
//             </button>
//           </div>

//           {loadingPosts ? (
//             <ul className="space-y-3">
//               {Array.from({ length: 5 }).map((_, i) => (
//                 <li key={i}>
//                   <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
//                   <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-100" />
//                 </li>
//               ))}
//             </ul>
//           ) : errorPosts ? (
//             <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorPosts}</div>
//           ) : posts.length === 0 ? (
//             <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
//               No posts yet. Be the first to write!
//             </div>
//           ) : (
//             <ul className="divide-y divide-gray-100">
//               {posts.map((p) => (
//                 <li key={p._id} className="py-3">
//                   <button
//                     onClick={() => ensureAuth(() => nav(schoolPath(`/freeboard/${p._id}`)))}
//                     className="flex w-full items-center justify-between text-left"
//                   >
//                     <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 sm:text-base hover:underline">
//                       {p.title}
//                     </h3>
//                     <span className="ml-3 shrink-0 text-xs text-gray-500">
//                       {dayjs(p.createdAt).fromNow()}
//                     </span>
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </section>
//       </div>
//     </div>
//   );
// }

// /* ====== helpers ====== */
// function CourseHubList({ title, items, badgeClass, onOpen }) {
//   return (
//     <div className="rounded-xl border p-4">
//       <div className="mb-2 text-sm font-semibold text-gray-900">{title}</div>
//       {!items || items.length === 0 ? (
//         <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
//           No postings yet.
//         </div>
//       ) : (
//         <ul className="divide-y divide-gray-100">
//           {items.map((m) => {
//             const id = m._id || m.id;
//             const code = (m.courseCode || m.course || "").toUpperCase();
//             const prof = m.professor || "Unknown";
//             const type = materialTypeLabel(m.materialType);
//             const created = m.createdAt ? dayjs(m.createdAt).fromNow() : "";
//             return (
//               <li key={id} className="py-3">
//                 <button
//                   onClick={() => onOpen(id)}
//                   className="flex w-full items-center justify-between text-left hover:opacity-95"
//                 >
//                   <div className="min-w-0">
//                     <div className="flex flex-wrap items-center gap-2">
//                       <span
//                         className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
//                       >
//                         {title}
//                       </span>
//                       <span className="truncate text-sm font-semibold text-gray-900 sm:text-base">
//                         {code || "UNKNOWN"}
//                       </span>
//                       <span className="truncate text-xs font-medium text-gray-700 sm:text-sm">
//                         {prof}
//                       </span>
//                       <span className="truncate text-[11px] text-gray-500 sm:text-xs">
//                         {type}
//                       </span>
//                     </div>
//                   </div>
//                   <span className="ml-3 shrink-0 text-xs text-gray-400">{created}</span>
//                 </button>
//               </li>
//             );
//           })}
//         </ul>
//       )}
//     </div>
//   );
// }



// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { useLoginGate } from "../../hooks/useLoginGate";

import { listPosts, getPublicPosts } from "../../api/posts";
import { listRecentMaterials } from "../../api/materials";
import { listItems as listMarketItems, getPublicMarketRecent } from "../../api/market";
// ✅ CareerBoard 미리보기용 API (FreeBoard와 동일 패턴 가정)
import { listCareerPosts, getPublicCareerPosts } from "../../api/careerPosts";

dayjs.extend(relativeTime);
dayjs.locale("en");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const { ensureAuth } = useLoginGate();
  const nav = useNavigate();
  const schoolPath = useSchoolPath();

  /* ================= Free Board (preview) ================= */
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState("");

  useEffect(() => {
    let alive = true;
    if (!school) return;
    (async () => {
      setLoadingPosts(true);
      setErrorPosts("");
      try {
        let data;
        if (token) data = await listPosts({ school, token });
        else data = await getPublicPosts({ school, page: 1, limit: 10 });
        const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (alive) setPosts(rows.slice(0, 5));
      } catch {
        if (alive) setErrorPosts("Failed to load posts.");
      } finally {
        if (alive) setLoadingPosts(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token]);

  /* ================= Career Board (preview) ================= */
  const [careerPosts, setCareerPosts] = useState([]);
  const [loadingCareer, setLoadingCareer] = useState(true);
  const [errorCareer, setErrorCareer] = useState("");

  useEffect(() => {
    let alive = true;
    if (!school) return;
    (async () => {
      setLoadingCareer(true);
      setErrorCareer("");
      try {
        let data;
        if (token) data = await listCareerPosts({ school, token });
        else data = await getPublicCareerPosts({ school, page: 1, limit: 10 });
        const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (alive) setCareerPosts(rows.slice(0, 5));
      } catch {
        if (alive) setErrorCareer("Failed to load career posts.");
      } finally {
        if (alive) setLoadingCareer(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token]);

  /* ================= CourseHub ================= */
  const [recentSale, setRecentSale] = useState([]);
  const [recentWanted, setRecentWanted] = useState([]);
  const [loadingCH, setLoadingCH] = useState(true);
  const [errorCH, setErrorCH] = useState("");

  useEffect(() => {
    let alive = true;
    if (!school) return;
    (async () => {
      setLoadingCH(true);
      setErrorCH("");
      try {
        const sale = await listRecentMaterials({ school, token, limit: 5, type: "sale" });
        const saleRows = Array.isArray(sale?.items) ? sale.items : Array.isArray(sale) ? sale : [];
        const wanted = await listRecentMaterials({ school, token, limit: 5, type: "wanted" });
        const wantedRows = Array.isArray(wanted?.items) ? wanted.items : Array.isArray(wanted) ? wanted : [];
        if (!alive) return;
        setRecentSale(saleRows);
        setRecentWanted(wantedRows);
      } catch {
        if (alive) setErrorCH("Failed to load CourseHub items.");
      } finally {
        if (alive) setLoadingCH(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token]);

  /* ================= Marketplace (latest 4) ================= */
  const [mktItems, setMktItems] = useState([]);
  const [loadingMkt, setLoadingMkt] = useState(true);
  const [errorMkt, setErrorMkt] = useState("");

  useEffect(() => {
    let alive = true;
    if (!school) return;
    (async () => {
      try {
        setLoadingMkt(true);
        setErrorMkt("");

        let rows = [];
        if (token) {
          const res = await listMarketItems({ school, token, page: 1, limit: 4, sort: "latest" });
          if (res && typeof res === "object" && Array.isArray(res.items)) {
            rows = res.items;
          } else if (Array.isArray(res)) {
            const sorted = [...res].sort((a, b) =>
              String(b.createdAt ?? b._id ?? "").localeCompare(String(a.createdAt ?? a._id ?? ""))
            );
            rows = sorted.slice(0, 4);
          }
        } else {
          const res = await getPublicMarketRecent({ school, limit: 4 });
          rows = res?.items || [];
        }

        if (!alive) return;
        setMktItems(rows.slice(0, 4));
      } catch {
        if (alive) setErrorMkt("Failed to load marketplace items.");
      } finally {
        if (alive) setLoadingMkt(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token]);

  const headerColor = { color: schoolTheme?.text || "#4c1d95" };
  const primaryBtn = { backgroundColor: schoolTheme?.primary || "#6b46c1" };

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        {/* ====== 상단 2열: Free Board | Career Board ====== */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Free Board preview */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <Header
              title="Free Board"
              onTitleClick={() => nav(schoolPath("/freeboard"))}
              onWrite={() => ensureAuth(() => nav(schoolPath("/freeboard/write")))}
              headerColor={headerColor}
              primaryBtn={primaryBtn}
              writeText="+ Write Post"
            />
            <PostList
              loading={loadingPosts}
              error={errorPosts}
              rows={posts}
              onOpen={(id) => ensureAuth(() => nav(schoolPath(`/freeboard/${id}`)))}
            />
          </section>

          {/* Career Board preview (Free와 동일 스타일) */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <Header
              title="Career Board"
              onTitleClick={() => nav(schoolPath("/career"))}
              onWrite={() => ensureAuth(() => nav(schoolPath("/career/write")))}
              headerColor={headerColor}
              primaryBtn={primaryBtn}
              writeText="+ Write Post"
            />
            <PostList
              loading={loadingCareer}
              error={errorCareer}
              rows={careerPosts}
              onOpen={(id) => ensureAuth(() => nav(schoolPath(`/career/${id}`)))}
            />
          </section>
        </div>

        {/* ====== 중간: CourseHub ====== */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              onClick={() => nav(schoolPath("/courses"))}
              className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
              style={headerColor}
            >
              CourseHub
            </h2>

            <div className="flex w-full justify-end sm:w-auto">
              <button
                onClick={() => ensureAuth(() => nav(schoolPath("/courses/write")))}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                style={primaryBtn}
              >
                + Upload Post
              </button>
            </div>
          </div>

          {loadingCH ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <div className="mb-2 h-5 w-24 animate-pulse rounded bg-gray-100" />
                  <ul className="divide-y divide-gray-100">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <li key={j} className="py-2">
                        <div className="flex items-center justify-between">
                          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                          <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : errorCH ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorCH}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CourseHubList
                title="For Sale"
                items={recentSale}
                badgeClass="bg-emerald-100 text-emerald-700"
                onOpen={(id) => nav(schoolPath(`/courses/materials/${id}`))}
              />
              <CourseHubList
                title="Wanted"
                items={recentWanted}
                badgeClass="bg-rose-100 text-rose-700"
                onOpen={(id) => nav(schoolPath(`/courses/materials/${id}`))}
              />
            </div>
          )}
        </section>

        {/* ====== 하단: Marketplace ====== */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              onClick={() => nav(schoolPath("/market"))}
              className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
              style={headerColor}
            >
              Marketplace
            </h2>

            <div className="flex w-full justify-end sm:w-auto">
              <button
                onClick={() => ensureAuth(() => nav(schoolPath("/market/write")))}
                className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto"
                style={primaryBtn}
              >
                + Post an item
              </button>
            </div>
          </div>

          {loadingMkt ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-200/60 bg-white shadow-sm">
                  <div className="aspect-[4/3] w-full rounded-t-2xl bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/5 rounded bg-gray-100" />
                    <div className="h-4 w-2/5 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : errorMkt ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMkt}</div>
          ) : mktItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
              No listings yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {mktItems.slice(0, 4).map((item) => {
                const id = item._id || item.id;
                const thumb = item.images?.[0] || item.image || "";
                return (
                  <button
                    key={id}
                    onClick={() => nav(schoolPath(`/market/${id}`))}
                    className="group block overflow-hidden rounded-2xl border border-gray-200/60 bg-white text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl">🖼️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-base font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {currency.format(Number(item.price) || 0)}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                        {item.sellerNickname || "Unknown"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ====== shared subcomponents ====== */
function Header({ title, onTitleClick, onWrite, headerColor, primaryBtn, writeText }) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2
        onClick={onTitleClick}
        className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
        style={headerColor}
      >
        {title}
      </h2>
      <button
        onClick={onWrite}
        className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto"
        style={primaryBtn}
      >
        {writeText}
      </button>
    </div>
  );
}

function PostList({ loading, error, rows, onOpen }) {
  if (loading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          </li>
        ))}
      </ul>
    );
  }
  if (error) {
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
        No posts yet. Be the first to write!
      </div>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((p) => (
        <li key={p._id} className="py-2">
          <button onClick={() => onOpen(p._id)} className="flex w-full items-center justify-between text-left">
            <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 hover:underline">{p.title}</h3>
            <span className="ml-3 shrink-0 text-[11px] text-gray-500">
              {p.createdAt ? dayjs(p.createdAt).fromNow() : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ====== helpers ====== */
function CourseHubList({ title, items, badgeClass, onOpen }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="mb-2 text-sm font-semibold text-gray-900">{title}</div>
      {!items || items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
          No postings yet.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((m) => {
            const id = m._id || m.id;
            const code = (m.courseCode || m.course || "").toUpperCase();
            const prof = m.professor || "Unknown";
            return (
              <li key={id} className="py-2">
                <button
                  onClick={() => onOpen(id)}
                  className="flex w-full items-center justify-between text.left hover:opacity-95"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                      >
                        {title}
                      </span>
                      <span className="truncate text-sm font-semibold text-gray-900">
                        {code || "UNKNOWN"}
                      </span>
                      <span className="truncate text-xs font-medium text-gray-700">
                        {prof}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}























