// // Another Candidate
// // frontend/src/pages/dashboard/Dashboard.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import "dayjs/locale/en";

// import { useAuth } from "../../contexts/AuthContext";
// import { useSchool } from "../../contexts/SchoolContext";
// import { useSchoolPath } from "../../utils/schoolPath";

// import { listPosts, getPublicPosts } from "../../api/posts";
// import { listRecentMaterials } from "../../api/materials";
// import { listItems as listMarketItems, getPublicMarketRecent } from "../../api/market";
// import { listCareerPosts, getPublicCareerPosts } from "../../api/careerPosts";

// dayjs.extend(relativeTime);
// dayjs.locale("en");

// const currency = new Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
// });

// /* ===================== Design tokens (phone UI) ===================== */
// const T = {
//   // outer desk background
//   deskBg: "#0F0F10",
//   // phone shell
//   shell: "#111113",
//   shellHighlight: "rgba(255,255,255,0.06)",
//   shellBorder: "rgba(255,255,255,0.12)",
//   // screen (app)
//   screenBg: "#FFFFFF",
//   text: "#111111",
//   sub: "#6B7280",
//   accent: "#EF4444",
//   divider: "rgba(17,17,17,0.1)",
//   soft: "rgba(17,17,17,0.05)",
// };

// /* ===================== Main ===================== */
// export default function Dashboard() {
//   const { token, user } = useAuth();
//   const { school } = useSchool();
//   const nav = useNavigate();
//   const schoolPath = useSchoolPath();

//   /* ---------------- Free Board ---------------- */
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
//         if (alive) setPosts(rows.slice(0, 6));
//       } catch {
//         if (alive) setErrorPosts("Failed to load posts.");
//       } finally {
//         if (alive) setLoadingPosts(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, [school, token]);

//   /* ---------------- Career Board ---------------- */
//   const [careerPosts, setCareerPosts] = useState([]);
//   const [loadingCareer, setLoadingCareer] = useState(true);
//   const [errorCareer, setErrorCareer] = useState("");

//   useEffect(() => {
//     let alive = true;
//     if (!school) return;
//     (async () => {
//       setLoadingCareer(true);
//       setErrorCareer("");
//       try {
//         let data;
//         if (token) data = await listCareerPosts({ school, token });
//         else data = await getPublicCareerPosts({ school, page: 1, limit: 10 });
//         const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
//         if (alive) setCareerPosts(rows.slice(0, 6));
//       } catch {
//         if (alive) setErrorCareer("Failed to load career posts.");
//       } finally {
//         if (alive) setLoadingCareer(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, [school, token]);

//   /* ---------------- CourseHub ---------------- */
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
//         const sale = await listRecentMaterials({ school, token, limit: 6, type: "sale" });
//         const saleRows = Array.isArray(sale?.items) ? sale.items : Array.isArray(sale) ? sale : [];
//         const wanted = await listRecentMaterials({ school, token, limit: 6, type: "wanted" });
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
//     return () => { alive = false; };
//   }, [school, token]);

//   /* ---------------- Marketplace ---------------- */
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
//           const res = await listMarketItems({ school, token, page: 1, limit: 6, sort: "latest" });
//           if (res && typeof res === "object" && Array.isArray(res.items)) rows = res.items;
//           else if (Array.isArray(res)) {
//             const sorted = [...res].sort((a, b) =>
//               String(b.createdAt ?? b._id ?? "").localeCompare(String(a.createdAt ?? a._id ?? ""))
//             );
//             rows = sorted.slice(0, 6);
//           }
//         } else {
//           const res = await getPublicMarketRecent({ school, limit: 6 });
//           rows = res?.items || [];
//         }
//         if (!alive) return;
//         setMktItems(rows.slice(0, 6));
//       } catch {
//         if (alive) setErrorMkt("Failed to load marketplace items.");
//       } finally {
//         if (alive) setLoadingMkt(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, [school, token]);

//   const tabs = useMemo(
//     () => ([
//       { key: "free", label: "Free", onClick: () => nav(schoolPath("/freeboard")) },
//       { key: "career", label: "Career", onClick: () => nav(schoolPath("/career")) },
//       { key: "courses", label: "Courses", onClick: () => nav(schoolPath("/courses")) },
//       { key: "market", label: "Market", onClick: () => nav(schoolPath("/market")) },
//     ]),
//     [nav, schoolPath]
//   );

//   return (
//     <div className="min-h-screen w-full flex items-center justify-center p-6"
//          style={{ background: T.deskBg }}>
//       {/* Phone shell */}
//       <div
//         className="relative rounded-[42px] border shadow-2xl"
//         style={{
//           width: 390, // iPhone 13 width
//           height: 844, // iPhone 13 height
//           background: T.shell,
//           borderColor: T.shellBorder,
//           boxShadow: "0 30px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
//         }}
//       >
//         {/* Side buttons (decorative) */}
//         <div className="absolute -left-1 top-[120px] h-24 w-1 rounded-r bg-white/20" />
//         <div className="absolute -right-1 top-[160px] h-10 w-1 rounded-l bg-white/20" />
//         <div className="absolute -right-1 top-[210px] h-20 w-1 rounded-l bg-white/20" />

//         {/* Screen bezel */}
//         <div
//           className="absolute inset-[12px] rounded-[32px] overflow-hidden"
//           style={{ background: "#000" }}
//         >
//           {/* Dynamic Island / notch */}
//           <div className="pointer-events-none absolute left-1/2 top-2 h-7 w-40 -translate-x-1/2 rounded-full"
//                style={{ background: "#0c0c0c", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />

//           {/* Actual app screen */}
//           <div className="absolute inset-0 overflow-hidden rounded-[30px]" style={{ background: T.screenBg }}>
//             {/* App header */}
//             <div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 pt-5 pb-3"
//                  style={{ background: "rgba(255,255,255,0.95)", borderColor: T.divider, backdropFilter: "blur(6px)" }}>
//               <div className="flex items-center gap-2">
//                 <span className="inline-flex h-6 w-6 items-center justify-center rounded-md"
//                       style={{ background: T.accent, color: "white", fontWeight: 800 }}>C</span>
//                 <div className="leading-tight">
//                   <div className="text-xs font-bold" style={{ color: T.text }}>{(school || "").toUpperCase()} • CNAPSS</div>
//                   <div className="text-[10px]" style={{ color: T.sub }}>Hi {user?.nickname || "there"} 👋</div>
//                 </div>
//               </div>
//               <button
//                 onClick={() => nav(schoolPath("/freeboard/write"))}
//                 className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
//                 style={{ background: T.accent }}
//                 title="Write Post"
//               >
//                 + Write
//               </button>
//             </div>

//             {/* Scrollable content */}
//             <div className="h-[calc(100%-96px)] overflow-y-auto px-4 pb-2">
//               {/* Section: Free */}
//               <PhoneSection
//                 title="Free Board"
//                 onOpen={() => nav(schoolPath("/freeboard"))}
//               >
//                 <PostListGrid
//                   loading={loadingPosts}
//                   error={errorPosts}
//                   rows={posts}
//                   onOpen={(id) => nav(schoolPath(`/freeboard/${id}`))}
//                 />
//               </PhoneSection>

//               {/* Section: Career */}
//               <PhoneSection
//                 title="Career Board"
//                 onOpen={() => nav(schoolPath("/career"))}
//               >
//                 <PostListGrid
//                   loading={loadingCareer}
//                   error={errorCareer}
//                   rows={careerPosts}
//                   onOpen={(id) => nav(schoolPath(`/career/${id}`))}
//                 />
//               </PhoneSection>

//               {/* Section: CourseHub */}
//               <PhoneSection
//                 title="CourseHub"
//                 cta={{ label: "+ Upload", onClick: () => nav(schoolPath("/courses/write")) }}
//                 onOpen={() => nav(schoolPath("/courses"))}
//               >
//                 {loadingCH ? (
//                   <SkeletonTwoCol />
//                 ) : errorCH ? (
//                   <ErrorBanner text={errorCH} />
//                 ) : (
//                   <div className="grid grid-cols-1 gap-3">
//                     <CourseHubList
//                       title="Offering"
//                       items={recentSale}
//                       badgeClass="bg-black text-white"
//                       onOpen={(id) => nav(schoolPath(`/courses/materials/${id}`))}
//                     />
//                     <CourseHubList
//                       title="Needed"
//                       items={recentWanted}
//                       badgeClass="bg-red-100 text-red-700"
//                       onOpen={(id) => nav(schoolPath(`/courses/materials/${id}`))}
//                     />
//                   </div>
//                 )}
//               </PhoneSection>

//               {/* Section: Market */}
//               <PhoneSection
//                 title="Marketplace"
//                 cta={{ label: "+ Post", onClick: () => nav(schoolPath("/market/write")) }}
//                 onOpen={() => nav(schoolPath("/market"))}
//               >
//                 {loadingMkt ? (
//                   <MarketplaceSkeleton />
//                 ) : errorMkt ? (
//                   <ErrorBanner text={errorMkt} />
//                 ) : mktItems.length === 0 ? (
//                   <EmptyState text="No listings yet." />
//                 ) : (
//                   <div className="grid grid-cols-2 gap-3">
//                     {mktItems.map((item) => {
//                       const id = item._id || item.id;
//                       const thumb = item.images?.[0] || item.image || "";
//                       return (
//                         <button
//                           key={id}
//                           onClick={() => nav(schoolPath(`/market/${id}`))}
//                           className="group overflow-hidden rounded-xl border text-left transition hover:shadow"
//                           style={{ borderColor: T.divider, background: "#fff" }}
//                         >
//                           <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
//                             {thumb ? (
//                               <img src={thumb} alt={item.title}
//                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
//                             ) : (
//                               <div className="flex h-full items-center justify-center text-3xl">🖼️</div>
//                             )}
//                             <span className="absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold text-white"
//                                   style={{ background: T.accent }}>NEW</span>
//                           </div>
//                           <div className="p-3">
//                             <h3 className="line-clamp-1 text-xs font-semibold" style={{ color: T.text }}>
//                               {item.title}
//                             </h3>
//                             <p className="mt-1 text-xs font-semibold" style={{ color: T.text }}>
//                               {currency.format(Number(item.price) || 0)}
//                             </p>
//                             <p className="mt-0.5 line-clamp-1 text-[10px]" style={{ color: T.sub }}>
//                               {item.sellerNickname || "Unknown"}
//                             </p>
//                           </div>
//                         </button>
//                       );
//                     })}
//                   </div>
//                 )}
//               </PhoneSection>
//             </div>

//             {/* Bottom tab bar */}
//             <TabBar tabs={tabs} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ===================== Phone UI building blocks ===================== */
// function PhoneSection({ title, cta, onOpen, children }) {
//   return (
//     <section className="mb-4">
//       <div className="mb-2 flex items-center justify-between">
//         <button
//           onClick={onOpen}
//           className="text-left text-sm font-extrabold tracking-tight hover:opacity-90"
//           style={{ color: T.text }}
//           title={`Open ${title}`}
//         >
//           {title}
//         </button>
//         {cta && (
//           <button
//             onClick={cta.onClick}
//             className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
//             style={{ background: T.accent }}
//           >
//             {cta.label}
//           </button>
//         )}
//       </div>
//       {children}
//     </section>
//   );
// }

// function TabBar({ tabs }) {
//   return (
//     <div
//       className="absolute bottom-0 left-0 right-0 border-t bg-white/95 px-2"
//       style={{ borderColor: T.divider, backdropFilter: "blur(6px)" }}
//     >
//       <div className="mx-auto grid grid-cols-4 gap-1 py-2">
//         {tabs.map((t) => (
//           <button
//             key={t.key}
//             onClick={t.onClick}
//             className="flex flex-col items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold hover:bg-black/5"
//             title={t.label}
//             style={{ color: T.text }}
//           >
//             <span className="mb-0.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: T.accent }} />
//             {t.label}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

// /* ===================== Reusable pieces (lists & states) ===================== */
// function ErrorBanner({ text }) {
//   return (
//     <div className="rounded-lg p-3 text-xs" style={{ background: "#FEE2E2", color: "#991B1B" }}>
//       {text}
//     </div>
//   );
// }

// function EmptyState({ text }) {
//   return (
//     <div className="rounded-lg border border-dashed p-6 text-center text-xs text-neutral-600"
//          style={{ borderColor: T.divider }}>
//       {text}
//     </div>
//   );
// }

// function SkeletonTwoCol() {
//   return (
//     <div className="grid grid-cols-1 gap-3">
//       {Array.from({ length: 2 }).map((_, i) => (
//         <div key={i} className="rounded-xl border p-3 bg-white" style={{ borderColor: T.divider }}>
//           <div className="mb-2 h-4 w-24 animate-pulse rounded" style={{ background: T.soft }} />
//           <ul className="divide-y" style={{ borderColor: T.divider }}>
//             {Array.from({ length: 5 }).map((__, j) => (
//               <li key={j} className="py-2">
//                 <div className="flex items-center justify-between">
//                   <div className="h-3.5 w-2/3 animate-pulse rounded" style={{ background: T.soft }} />
//                   <div className="h-3 w-16 animate-pulse rounded" style={{ background: T.soft }} />
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ))}
//     </div>
//   );
// }

// function MarketplaceSkeleton() {
//   return (
//     <div className="grid grid-cols-2 gap-3">
//       {Array.from({ length: 6 }).map((_, i) => (
//         <div key={i} className="animate-pulse rounded-xl border bg-white"
//              style={{ borderColor: T.divider }}>
//           <div className="aspect-[4/3] w-full rounded-t-xl" style={{ background: T.soft }} />
//           <div className="p-3 space-y-2">
//             <div className="h-3.5 w-3/5 rounded" style={{ background: T.soft }} />
//             <div className="h-3.5 w-2/5 rounded" style={{ background: T.soft }} />
//             <div className="h-2.5 w-1/2 rounded" style={{ background: T.soft }} />
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function PostListGrid({ loading, error, rows, onOpen }) {
//   if (loading) {
//     return (
//       <div className="grid grid-cols-1 gap-2">
//         {Array.from({ length: 6 }).map((_, i) => (
//           <div key={i} className="h-12 animate-pulse rounded-lg" style={{ background: T.soft }} />
//         ))}
//       </div>
//     );
//   }
//   if (error) return <ErrorBanner text={error} />;
//   if (!rows || rows.length === 0) return <EmptyState text="No posts yet. Be the first to write!" />;

//   return (
//     <ul className="grid grid-cols-1 gap-2">
//       {rows.map((p) => (
//         <li key={p._id}>
//           <button
//             onClick={() => onOpen(p._id)}
//             className="group block w-full rounded-lg border bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
//             style={{ borderColor: T.divider }}
//           >
//             <div className="flex items-start justify-between gap-2">
//               <h3 className="min-w-0 grow truncate text-[13px] font-semibold" style={{ color: T.text }}>
//                 {p.title}
//               </h3>
//               <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold text-white"
//                     style={{ background: T.accent }}>
//                 {p.createdAt ? dayjs(p.createdAt).fromNow() : "NEW"}
//               </span>
//             </div>
//           </button>
//         </li>
//       ))}
//     </ul>
//   );
// }

// function CourseHubList({ title, items, badgeClass, onOpen }) {
//   return (
//     <div className="rounded-xl border p-3 bg-white" style={{ borderColor: T.divider }}>
//       <div className="mb-1 text-xs font-extrabold" style={{ color: T.text }}>{title}</div>
//       {!items || items.length === 0 ? (
//         <EmptyState text="No postings yet." />
//       ) : (
//         <ul className="divide-y" style={{ borderColor: T.divider }}>
//           {items.map((m) => {
//             const id = m._id || m.id;
//             const isWanted = String(m.listingType || "sale") === "wanted";
//             const codeTitle = [m.courseCode, m.courseTitle].filter(Boolean).join(" — ");
//             const sub = [m.professor ? `Prof. ${m.professor}` : null, m.semester || null].filter(Boolean).join(" · ");
//             const priceText = m.isFree ? "Free" : `$${Number(m.price || 0)}`;

//             return (
//               <li key={id} className="py-2">
//                 <button onClick={() => onOpen(id)} className="block w-full text-left">
//                   <div className="flex items-start justify-between gap-2">
//                     <div className="min-w-0">
//                       <div className="flex items-start gap-2">
//                         <span
//                           className={
//                             "mt-0.5 inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold " +
//                             (isWanted ? "bg-red-100 text-red-700" : "bg-black text-white")
//                           }
//                         >
//                           {isWanted ? "Wanted" : "For Sale"}
//                         </span>
//                         <h4 className="min-w-0 truncate text-[13px] font-semibold" style={{ color: T.text }}>
//                           {codeTitle || m.title || m.courseCode}
//                         </h4>
//                       </div>
//                       {sub && (
//                         <div className="mt-0.5 truncate text-[10px]" style={{ color: T.sub }}>
//                           {sub}
//                         </div>
//                       )}
//                     </div>
//                     <div className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
//                          style={{ background: T.accent }}>
//                       {priceText}
//                     </div>
//                   </div>
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";

/* ===== Light theme tokens (match cnapss.com vibe) ===== */
const TOKENS = {
  bg: "#FFFFFF",
  text: "#111111",
  sub: "#6B7280",
  border: "rgba(0,0,0,0.1)",
  soft: "rgba(0,0,0,0.05)",
  red: "#EF4444",
};

export default function Dashboard() {
  const { school } = useSchool();
  const nav = useNavigate();
  const schoolPath = useSchoolPath();
  const campus = (school || "Campus").toUpperCase();

  // Contextual phrases (edit freely)
  const phrases = useMemo(
    () => ["class materials", "campus discussions", "student deals", "study buddies", "group meeting times"],
    []
  );

  return (
    <div className="min-h-screen" style={{ background: TOKENS.bg }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold text-black/70">CNAPSS · Official Landing</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Ghost onClick={() => nav(schoolPath("/auth/login"))}>Sign in</Ghost>
            <Primary onClick={() => nav(schoolPath("/auth/register"))}>JOIN NOW</Primary>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* ===== HERO (white theme) ===== */}
        <section className="py-10 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left copy */}
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-black">
                Looking for{" "}
                <FluidDownTicker
                  items={phrases}
                  slideMs={900}      // slide speed
                  intervalMs={2400}  // hold + slide cycle
                  accent={TOKENS.red}
                />{" "}
                at {campus}?
              </h1>

              {/* Context chips / faux search */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Chip>
                  <PinIcon />
                  <span className="text-sm font-semibold">{campus}</span>
                </Chip>
                <Chip>
                  <span className="text-sm font-semibold">Category</span>
                  <ChevronDown />
                </Chip>
                <div
                  className="flex-1 min-w-[220px] max-w-xl rounded-full border px-4 py-2"
                  style={{ borderColor: TOKENS.border }}
                >
                  <span className="text-sm" style={{ color: TOKENS.sub }}>
                    Try keywords like “textbook”, “CS tutor”, “group study”
                  </span>
                </div>
                <Primary onClick={() => nav(schoolPath("/freeboard"))}>GO</Primary>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {["Textbooks", "Study groups", "Part-time jobs", "Dorm life", "Food near campus"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border px-3 py-1 text-xs"
                    style={{ borderColor: TOKENS.border, color: TOKENS.sub }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right phone mock (subtle, like current landing) */}
            <div className="relative mx-auto w-full max-w-md">
              <PhoneMock />
              <Sticker text="Campus-only" />
              <Sticker text="Email Verified" bottom />
            </div>
          </div>
        </section>

        {/* ===== Three big choices ===== */}
        <section className="pb-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <BigCard
              title="CourseHub"
              desc="Find and share materials by course, professor, or semester."
              cta="Browse CourseHub"
              onClick={() => nav(schoolPath("/courses"))}
              icon={<BookIcon />}
            />
            <BigCard
              title="Free Board"
              desc="Ask questions, swap tips, and keep up with your campus."
              cta="Open Free Board"
              onClick={() => nav(schoolPath("/freeboard"))}
              icon={<ChatIcon />}
            />
            <BigCard
              title="Marketplace"
              desc="Buy & sell textbooks, furniture, and more — student to student."
              cta="Explore Marketplace"
              onClick={() => nav(schoolPath("/market"))}
              icon={<TagIcon />}
            />
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: TOKENS.sub }}>
            * This dashboard is a quick hub. Jump into any section to get started.
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs" style={{ color: TOKENS.sub }}>
          CNAPSS · Made for campus life · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

/* ===================== Fluid Down Ticker ===================== */
/**
 * Smooth downward slide, no flash, and the container width fluidly follows
 * the CURRENT phrase (not the max). Width transition is synchronized with slide.
 */
function FluidDownTicker({ items = [], intervalMs = 2400, slideMs = 900, accent = "#EF4444" }) {
  const [index, setIndex] = useState(0);               // current visible item
  const [sliding, setSliding] = useState(false);       // controls transform/transition
  const [width, setWidth] = useState(0);               // viewport width bound to CURRENT phrase
  const measurerRef = useRef(null);                    // hidden measurer
  const rafRef = useRef(0);

  // Measure widths for all phrases once
  const [widthMap, setWidthMap] = useState([]);
  useEffect(() => {
    if (!measurerRef.current || items.length === 0) return;
    const spans = Array.from(measurerRef.current.querySelectorAll("[data-phrase]"));
    const w = spans.map((el) => el.clientWidth);
    setWidthMap(w);
    setWidth(w[0] || 0); // start with first phrase width
  }, [items]);

  // Timer loop: at each tick → set target width to NEXT phrase, then slide down.
  useEffect(() => {
    if (items.length <= 1 || widthMap.length === 0) return;
    const id = setInterval(() => {
      const nextIdx = (index + 1) % items.length;
      // 1) prepare: match viewport width to NEXT phrase (so it morphs during slide)
      setWidth(widthMap[nextIdx] || 0);

      // 2) start slide on next frame (to avoid layout thrash)
      rafRef.current = requestAnimationFrame(() => setSliding(true));

      // 3) after slide ends, commit index and reset (no transition)
      const end = setTimeout(() => {
        setIndex(nextIdx);
        // double RAF to ensure transform reset is not visible
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = requestAnimationFrame(() => setSliding(false));
        });
        clearTimeout(end);
      }, slideMs);
    }, intervalMs);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(rafRef.current);
    };
  }, [index, items.length, widthMap, intervalMs, slideMs]);

  const nextIndex = (index + 1) % (items.length || 1);

  // Styles
  const viewportStyle = {
    display: "inline-block",
    position: "relative",
    overflow: "hidden",
    height: "1.1em",
    lineHeight: "1.1em",
    verticalAlign: "baseline",
    width: width ? `${width}px` : "auto",
    transition: sliding ? `width ${slideMs}ms cubic-bezier(.22,.61,.36,1)` : "none",
  };

  const layerBase = {
    position: "absolute",
    left: 0,
    top: 0,
    whiteSpace: "nowrap",
    fontWeight: 900,
    willChange: "transform",
    pointerEvents: "none",
  };

  return (
    <span className="inline-block relative align-baseline">
      {/* Hidden measurer */}
      <span
        ref={measurerRef}
        aria-hidden
        className="absolute -left-[9999px] top-0 font-black"
        style={{ whiteSpace: "nowrap" }}
      >
        {items.map((p, i) => (
          <span key={i} data-phrase className="inline-block mr-4">
            <em style={{ color: accent, fontStyle: "normal" }}>{p}</em>
          </span>
        ))}
      </span>

      {/* Viewport */}
      <span style={viewportStyle} className="font-black">
        {/* current */}
        <span
          style={{
            ...layerBase,
            transform: sliding ? "translateY(105%)" : "translateY(0%)",
            transition: sliding ? `transform ${slideMs}ms cubic-bezier(.22,.61,.36,1)` : "none",
            visibility: sliding ? "visible" : "visible",
          }}
        >
          <em style={{ color: accent, fontStyle: "normal" }}>{items[index] || ""}</em>
        </span>

        {/* next */}
        <span
          style={{
            ...layerBase,
            transform: sliding ? "translateY(0%)" : "translateY(-105%)",
            transition: sliding ? `transform ${slideMs}ms cubic-bezier(.22,.61,.36,1)` : "none",
            // hide next line when idle to kill any flash
            visibility: sliding ? "visible" : "hidden",
          }}
        >
          <em style={{ color: accent, fontStyle: "normal" }}>{items[nextIndex] || ""}</em>
        </span>
      </span>
    </span>
  );
}

/* ===================== UI bits ===================== */
function Logo() {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-red-600 text-white font-black">
        C
      </span>
      <span className="text-base font-extrabold tracking-tight">CNAPSS</span>
    </div>
  );
}
function Primary({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:shadow transition"
      style={{ background: TOKENS.red }}
    >
      {children}
    </button>
  );
}
function Ghost({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5"
      style={{ color: TOKENS.text }}
    >
      {children}
    </button>
  );
}
function Chip({ children }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
      style={{ borderColor: TOKENS.border }}
    >
      {children}
    </span>
  );
}

/* ===== Cards ===== */
function BigCard({ title, desc, cta, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border text-left transition hover:-translate-y-[2px] hover:shadow-md"
      style={{ background: "#fff", borderColor: TOKENS.border }}
      title={title}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10" style={{ background: TOKENS.red }} />
      <div className="p-6">
        <div className="mb-3">{icon}</div>
        <div className="text-lg font-extrabold text-black">{title}</div>
        <p className="mt-1 text-sm" style={{ color: TOKENS.sub }}>
          {desc}
        </p>
        <div className="mt-5 inline-flex items-center gap-1 text-sm font-bold" style={{ color: TOKENS.red }}>
          {cta}
          <ArrowRight />
        </div>
      </div>
    </button>
  );
}

/* ===== Phone mock (simple, light) ===== */
function PhoneMock() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      <div className="rounded-[36px] border bg-white p-4 shadow-sm" style={{ borderColor: TOKENS.border }}>
        <div className="mx-auto h-[540px] w-full overflow-hidden rounded-[28px] border" style={{ borderColor: TOKENS.border }}>
          <div className="h-24 w-full bg-red-50 flex items-center justify-center text-red-700 text-sm font-bold">CNAPSS · {`{school}`}</div>
          <div className="h-12 w-full border-b flex items-center justify-between px-3" style={{ borderColor: TOKENS.border }}>
            <span className="text-xs font-bold">Free Board</span>
            <span className="text-[10px] rounded px-2 py-0.5 bg-red-600 text-white font-bold">NEW</span>
          </div>
          <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
            {["Best study spots on campus?", "Selling Calc textbook", "Looking for CS tutor", "Where to eat near library?"].map((t, i) => (
              <li key={i} className="p-3">
                <div className="text-[13px] font-semibold text-black line-clamp-1">{t}</div>
                <div className="text-[11px]" style={{ color: TOKENS.sub }}>2h ago · by Student {i + 1}</div>
              </li>
            ))}
          </ul>
          <div className="mt-auto h-14 w-full border-t bg-white flex items-center justify-center gap-2" style={{ borderColor: TOKENS.border }}>
            <small className="text-[11px]" style={{ color: TOKENS.sub }}>Preview only · Get the app</small>
          </div>
        </div>
      </div>
    </div>
  );
}
function Sticker({ text = "NEW", bottom = false }) {
  return (
    <span
      className={`absolute left-1/2 -translate-x-1/2 ${bottom ? "bottom-2" : "top-2"} rotate-[-3deg] rounded px-2 py-0.5 text-[11px] font-extrabold text-white shadow`}
      style={{ background: TOKENS.red }}
    >
      {text}
    </span>
  );
}

/* ===== Icons ===== */
function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-70">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M7 12h10M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2l3 5-3 9-3-9 3-5z" fill="currentColor" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" fill="currentColor" opacity="0.12" />
      <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M5 8h12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 5h16v10H7l-3 3V5z" fill="currentColor" opacity="0.12" />
      <path d="M4 5h16v10H7l-3 3V5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="13" cy="10" r="1" fill="currentColor" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 12l9-9 9 9-9 9-9-9z" fill="currentColor" opacity="0.12" />
      <path d="M3 12l9-9 9 9-9 9-9-9z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
    </svg>
  );
}




























