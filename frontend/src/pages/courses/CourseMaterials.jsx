// frontend/src/pages/courses/CourseMaterials.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getJson } from "../../api/http";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date();
  const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseMaterials() {
  const { courseId } = useParams();
  const { school } = useSchool();
  const { token } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const [sem, setSem] = useState(sp.get("sem") || currentSemester());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("new");
  const [err, setErr] = useState("");

  const kinds = useMemo(
    () => ["all", "note", "syllabus", "exam", "slide", "link", "other"],
    []
  );

  const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!token || !school || !courseId) return;
      setLoading(true);
      setErr("");
      try {
        const qs = new URLSearchParams({
          course: decodeURIComponent(courseId),
          semester: sem,
          kind,
          sort,
          page: "1",
          limit: "50",
        }).toString();
        const url = `${API}/api/${encodeURIComponent(school)}/materials?${qs}`;
        const data = await getJson(url);
        if (!alive) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (alive) {
          setItems([]);
          setErr("Failed to load materials.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [API, token, school, courseId, sem, kind, sort]);

  const goDetail = (id) => {
    const qs = new URLSearchParams({
      course: decodeURIComponent(courseId),
      sem,
    }).toString();
    navigate(schoolPath(`/courses/materials/${id}?${qs}`));
  };

  return (
    <div className="p-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">
          {decodeURIComponent(courseId)} · Materials
        </h1>
        <button
          className="rounded-xl border px-3 py-1.5 text-sm"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={sem}
          onChange={(e) => setSem(e.target.value)}
          className="w-44 rounded-lg border px-3 py-2 text-sm"
        >
          {(() => {
            const now = new Date();
            const y = now.getFullYear();
            const opts = Array.from(
              new Set([
                `${y - 1}-fall`,
                `${y}-spring`,
                `${y}-summer`,
                `${y}-fall`,
                `${y + 1}-spring`,
              ])
            );
            return opts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ));
          })()}
        </select>

        {/* Kind filter */}
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k}
              className={`rounded-full px-3 py-1.5 text-xs ${
                kind === k ? "bg-blue-600 text-white" : "border text-gray-700"
              }`}
              onClick={() => setKind(k)}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border px-2 py-1 text-xs"
          >
            <option value="new">Newest</option>
            <option value="top">Top</option>
            <option value="price">Price</option>
          </select>
        </div>

        <div className="flex-1" />

        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() =>
            navigate(schoolPath(`/courses/${encodeURIComponent(courseId)}/upload`))
          }
        >
          Upload
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border p-6 text-sm text-gray-600">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-gray-600">
          No materials found for this course/semester.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {items.map((m) => (
            <li key={m.id} className="p-3">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left hover:bg-gray-50"
                onClick={() => goDetail(m.id)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {m.kind ? m.kind.toUpperCase() : "MATERIAL"} ·{" "}
                    <span className="text-gray-700">{m.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    by {m.authorName || m.uploaderEmail || "Unknown"} ·{" "}
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-gray-500">
                    ❤ {m.likeCount || 0} · 👁 {m.viewCount || 0}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
    </div>
  );
}

