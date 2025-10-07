// frontend/src/pages/courses/Courses.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { listRecentMaterials } from "../../api/materials";
import Pagination from "../../components/Pagination";

// Flexible label map (다양한 표기 흡수)
const CHIP_LABEL = {
  syllabus: "Syllabus",
  syllabus_only: "Syllabus",
  outline: "Syllabus",

  exam: "Last exams",
  exams: "Last exams",
  last_exam: "Last exams",
  last_exams: "Last exams",
  lastexams: "Last exams",
  lastExams: "Last exams",
  past_exam: "Last exams",
  past_exams: "Last exams",

  notes: "Notes",
  lecture_notes: "Notes",
  slides: "Slides",
  homework: "Homework",
  solutions: "Solutions",
  general: "General",
  other: "Others",
  others: "Others",
};

const PAGE_SIZE = 20;

export default function Courses() {
  const { token } = useAuth();
  const { school } = useSchool();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();
  const [sp, setSp] = useSearchParams();

  // "sale" | "wanted"  (UI: Offering | Needed)
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

  // URL sync
  useEffect(() => {
    const next = new URLSearchParams(sp);
    type === "sale" ? next.delete("type") : next.set("type", "wanted");
    q ? next.set("q", q) : next.delete("q");
    prof ? next.set("prof", prof) : next.delete("prof");
    next.set("page", "1");
    setSp(next, { replace: true });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q, prof]);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    type === "sale" ? next.delete("type") : next.set("type", "wanted");
    q ? next.set("q", q) : next.delete("q");
    prof ? next.set("prof", prof) : next.delete("prof");
    next.set("page", String(page));
    setSp(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Load list
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!school) return;
      setErr("");
      if (!hasLoadedOnce) setLoading(true);
      else setIsSearching(true);

      try {
        const res = await listRecentMaterials({
          school,
          token,
          page,
          limit: PAGE_SIZE,
          q: q.trim(),
          prof: prof.trim(),
          type,
        });
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (alive) {
          setItems(list);
          setTotal(Number(res?.total || list.length || 0));
        }
      } catch {
        if (alive) setErr("Failed to load postings.");
      } finally {
        if (!alive) return;
        if (!hasLoadedOnce) setHasLoadedOnce(true);
        setLoading(false);
        setIsSearching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school, token, page, q, prof, hasLoadedOnce, type]);

  const onCreate = () => navigate(schoolPath("/courses/write"));
  const goDetail = (id) => navigate(schoolPath(`/courses/materials/${encodeURIComponent(id)}`));

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

  // Build chips from multiple possible fields
  const buildChips = (m) => {
    let raw =
      (Array.isArray(m.offerings) && m.offerings) ||
      (Array.isArray(m.chips) && m.chips) ||
      (Array.isArray(m.categories) && m.categories) ||
      (Array.isArray(m.tags) && m.tags) ||
      (Array.isArray(m.tagList) && m.tagList) ||
      (Array.isArray(m.labels) && m.labels) ||
      m.offerings ||
      m.chips ||
      m.categories ||
      m.tags ||
      m.tagList ||
      m.labels ||
      [];

    // 문자열인 경우 콤마/슬래시/공백으로 분할
    if (typeof raw === "string") {
      raw = raw
        .split(/[,/]/g)
        .join(" ")
        .split(/\s+/g)
        .filter(Boolean);
    }

    const labels = Array.from(
      new Set(
        (raw || [])
          .map((x) => String(x).toLowerCase().trim().replace(/\s+/g, "_"))
          .map((k) => CHIP_LABEL[k] || null)
          .filter(Boolean)
      )
    );
    return labels;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-semibold">CourseHub</h1>
            <div className="rounded-full bg-gray-100 p-1">
              <SegBtn active={type === "sale"} onClick={() => setType("sale")}>Offering</SegBtn>
              <SegBtn active={type === "wanted"} onClick={() => setType("wanted")}>Needed</SegBtn>
            </div>
          </div>

          <div className="order-last flex w-full max-w-xl items-center gap-2 sm:order-none">
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
              className="w-36 sm:w-40 rounded-xl border px-3 py-2 text-sm bg-white"
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
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Create
          </button>
        </div>

        {/* Skeleton */}
        {showSkeleton && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-rose-50" />
            ))}
          </div>
        )}

        {/* Error */}
        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Empty */}
        {empty && (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-500">
            No postings found.
          </div>
        )}

        {/* List */}
        {!!items.length && (
          <ul className="space-y-3">
            {items.map((m) => {
              const id = m.id || m._id;
              const title = m.courseTitle || m.title || m.courseCode || "Untitled course";
              const subtitleLeft = [m.courseCode || null, m.semester || null].filter(Boolean).join(" · ");
              const professorRight = m.professor || "";
              const chips = buildChips(m);

              return (
                <li key={id}>
                  <button className="block w-full text-left" onClick={() => goDetail(id)} title={title}>
                    <div className="rounded-2xl bg-rose-50 p-4 sm:p-5">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* avatar */}
                        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-gray-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                            <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.35" />
                            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="currentColor" opacity="0.2" />
                          </svg>
                        </div>

                        <div className="min-w-0 grow">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 truncate text-xl sm:text-2xl font-extrabold text-black">
                              {title}
                            </h3>
                            <div className="shrink-0 text-xs sm:text-sm font-medium text-gray-900">
                              {professorRight}
                            </div>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs sm:text-sm font-medium text-gray-700">
                              {subtitleLeft}
                            </div>
                          </div>

                          {chips.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
                              {chips.map((label) => (
                                <span
                                  key={label}
                                  className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
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














