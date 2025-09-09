// frontend/src/pages/courses/Courses.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { listRecentMaterials } from "../../api/materials";
import Pagination from "../../components/Pagination";

const prettyKind = (v) =>
  v === "note"
    ? "Class Note"
    : v === "syllabus"
    ? "Syllabus"
    : v === "exam"
    ? "Exam"
    : v === "slide"
    ? "Slide"
    : v === "link"
    ? "Link"
    : "Other";

const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h / 24);
  return `${d2}d ago`;
};

const PAGE_SIZE = 20;

export default function Courses() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();
  const [sp, setSp] = useSearchParams();

  const initialType = sp.get("type") === "wanted" ? "wanted" : "sale";
  const [type, setType] = useState(initialType);

  const initialPage = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const [page, setPage] = useState(initialPage);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [err, setErr] = useState("");

  const [q, setQ] = useState(sp.get("q") || "");
  const [prof, setProf] = useState(sp.get("prof") || "");
  const [qDeb, setQDeb] = useState(q.trim());
  const [profDeb, setProfDeb] = useState(prof.trim());

  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setProfDeb(prof.trim()), 350);
    return () => clearTimeout(t);
  }, [prof]);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    type === "sale" ? next.delete("type") : next.set("type", "wanted");
    q ? next.set("q", q) : next.delete("q");
    prof ? next.set("prof", prof) : next.delete("prof");
    next.set("page", "1");
    setSp(next, { replace: true });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, qDeb, profDeb]);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set("page", String(page));
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const containerClass = "mx-auto max-w-5xl p-4 sm:p-6";
  const cardClass =
    "rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow bg-white";

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!school || !token) return;
      setErr("");

      if (!hasLoadedOnce) setLoading(true);
      else setIsSearching(true);

      try {
        const res = await listRecentMaterials({
          school,
          token,
          page,
          limit: PAGE_SIZE,
          q: qDeb,
          prof: profDeb,
          type,
        });
        const list = Array.isArray(res?.items) ? res.items : [];
        if (alive) {
          setItems(list);
          setTotal(Number(res?.total || 0));
        }
      } catch {
        if (alive) setErr("Failed to load postings.");
      } finally {
        if (!alive) return;
        if (!hasLoadedOnce) setHasLoadedOnce(true);
        setLoading(false);
        setIsSearching(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [school, token, page, qDeb, profDeb, hasLoadedOnce, type]);

  const onCreate = () => navigate(schoolPath("/courses/write"));
  const goDetail = (id) =>
    navigate(schoolPath(`/courses/materials/${encodeURIComponent(id)}`));

  const showSkeleton = loading && !hasLoadedOnce;
  const empty = !showSkeleton && !isSearching && !items.length && !err;

  const SegBtn = ({ active, children, onClick }) => (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
        (active ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-800")
      }
    >
      {children}
    </button>
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className={containerClass}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">CourseHub</h1>
            <div className="rounded-full bg-gray-100 p-1">
              <SegBtn active={type === "sale"} onClick={() => setType("sale")}>
                For sale
              </SegBtn>
              <SegBtn active={type === "wanted"} onClick={() => setType("wanted")}>
                Wanted
              </SegBtn>
            </div>
          </div>

          <div className="flex w-full max-w-xl items-center gap-2 sm:order-none order-last">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by course code or title"
              className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            />
            <input
              value={prof}
              onChange={(e) => setProf(e.target.value)}
              placeholder="Professor"
              className="w-40 rounded-xl border px-3 py-2 text-sm bg-white"
            />
            {(q || prof) && (
              <button
                onClick={() => {
                  setQ("");
                  setProf("");
                }}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Clear
              </button>
            )}
            {isSearching && <span className="text-xs text-gray-500">Searching…</span>}
          </div>

          <button
            onClick={onCreate}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Create
          </button>
        </div>

        {showSkeleton && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[84px] animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        )}

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {empty && (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-500">
            No postings found.
          </div>
        )}

        {!!items.length && (
          <ul className="space-y-3">
            {items.map((m) => {
              const isWanted = (m.listingType || "sale") === "wanted";
              return (
                <li key={m.id || m._id}>
                  <button
                    className={cardClass + " w-full text-left"}
                    onClick={() => goDetail(m.id || m._id)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                              (isWanted
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700")
                            }
                          >
                            {isWanted ? "Wanted" : "For Sale"}
                          </span>
                          <div className="text-sm font-semibold">
                            {m.courseCode || "Unknown course"}
                            {m.semester ? ` · ${m.semester}` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {prettyKind(m.kind)}
                          {m.materialType ? ` • ${m.materialType}` : ""}
                          {m.professor ? ` • ${m.professor}` : ""}
                          {m.authorName ? ` • ${m.authorName}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">{timeAgo(m.createdAt)}</div>
                    </div>
                    {m.title ? (
                      <div className="mt-1 text-sm text-gray-700 line-clamp-2">{m.title}</div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* ✅ 항상 페이지네이션 표시(아이템만 있으면) — 1페이지만 있어도 보여줌 */}
        {items.length > 0 && (
          <Pagination
            page={page}
            total={Math.max(total, items.length)}
            limit={PAGE_SIZE}
            onPageChange={(p) => setPage(p)}
            siblingCount={1}
            boundaryCount={1}
            className="mb-2"
            showStatus
          />
        )}
      </div>
    </div>
  );
}










