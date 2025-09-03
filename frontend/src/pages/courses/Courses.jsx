// frontend/src/pages/courses/Courses.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { listRecentMaterials } from "../../api/materials";

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

export default function Courses() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // search UI
  const [q, setQ] = useState("");       // course code or title
  const [prof, setProf] = useState(""); // professor
  const [qDeb, setQDeb] = useState("");
  const [profDeb, setProfDeb] = useState("");

  // debounce 350ms
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setProfDeb(prof.trim()), 350);
    return () => clearTimeout(t);
  }, [prof]);

  const containerClass = "mx-auto max-w-5xl p-4 sm:p-6";
  const cardClass =
    "rounded-2xl border shadow-sm p-4 hover:shadow-md transition-shadow bg-white";

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!school || !token) return;
      setLoading(true);
      setErr("");
      try {
        const res = await listRecentMaterials({
          school,
          token,
          limit,
          q: qDeb,
          prof: profDeb,
        });
        const list = Array.isArray(res?.items) ? res.items : [];
        if (alive) setItems(list);
      } catch {
        if (alive) setErr("Failed to load postings.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [school, token, limit, qDeb, profDeb]);

  const onCreate = () => navigate(schoolPath("/courses/write"));
  const goDetail = (id) =>
    navigate(schoolPath(`/courses/materials/${encodeURIComponent(id)}`));

  const empty = !loading && !items.length && !err;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className={containerClass}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold">CourseHub</h1>

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
          </div>

          <button
            onClick={onCreate}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Create
          </button>
        </div>

        {loading && (
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
            {items.map((m) => (
              <li key={m.id || m._id}>
                <button
                  className={cardClass + " w-full text-left"}
                  onClick={() => goDetail(m.id || m._id)}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {m.courseCode || "Unknown course"}
                        {m.semester ? ` · ${m.semester}` : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        {prettyKind(m.kind)}
                        {m.materialType ? ` • ${m.materialType}` : ""}
                        {m.professor ? ` • ${m.professor}` : ""}
                        {m.authorName ? ` • ${m.authorName}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {timeAgo(m.createdAt)}
                    </div>
                  </div>

                  {m.title ? (
                    <div className="mt-1 text-sm text-gray-700 line-clamp-2">
                      {m.title}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!!items.length && items.length >= limit && (
          <div className="mt-4 flex justify-center">
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => setLimit((v) => Math.min(100, v + 20))}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}





