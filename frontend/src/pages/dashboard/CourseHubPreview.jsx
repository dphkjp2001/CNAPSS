// frontend/src/pages/dashboard/CourseHubPreview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { useLoginGate } from "../../hooks/useLoginGate";

const materialTypeLabel = (t) =>
  t === "personalNote" ? "personal note" : "personal material";

export default function CourseHubPreview() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const { ensureAuth } = useLoginGate();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  useEffect(() => {
    let alive = true;
    if (!token || !school) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(
          `${API}/api/${encodeURIComponent(school)}/materials/recent?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (alive) setItems(Array.isArray(json?.items) ? json.items : []);
      } catch (e) {
        if (alive) {
          setErr("Failed to load recent materials.");
          setItems([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API, token, school]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2
        className="mb-4 text-xl font-semibold"
        style={{ color: schoolTheme?.text || "#4f46e5" }}
      >
        CourseHub
      </h2>

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="animate-pulse">
              <div className="h-5 w-3/4 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
            </li>
          ))}
        </ul>
      ) : err ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
          No posts yet.
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((m) => (
            <li key={m.id} className="py-3">
              <button
                type="button"
                className="block w-full text-left hover:bg-gray-50"
                onClick={() =>
                  ensureAuth(() =>
                    navigate(
                      schoolPath(
                        `/courses/materials/${m.id}?course=${encodeURIComponent(
                          m.courseCode || ""
                        )}&sem=${encodeURIComponent(m.semester || "")}`
                      )
                    )
                  )
                }
              >
                {/* 한 줄: 과목명 — 교수이름(N/A) — 파일 타입 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {m.courseTitle || m.courseCode || "Unknown course"}
                      <span className="mx-2 text-gray-400">—</span>
                      <span className="text-gray-700">N/A</span>
                      <span className="mx-2 text-gray-400">—</span>
                      <span className="text-gray-600">
                        {materialTypeLabel(m.materialType)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {m.title}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-blue-600 underline">open</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => ensureAuth(() => navigate(schoolPath("/courses/write")))}
          className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Upload note
        </button>
        <button
          onClick={() => ensureAuth(() => navigate(schoolPath("/courses")))}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Open Course Hub
        </button>
      </div>
    </div>
  );
}

