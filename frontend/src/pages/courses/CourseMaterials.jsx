// src/pages/courses/CourseMaterials.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date(); const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseMaterials() {
  const { courseId } = useParams();
  const { school } = useSchool();
  const { token } = useAuth();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const [sem, setSem] = useState(currentSemester());
  const [items, setItems] = useState([]); // 자료 목록
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("all");

  useEffect(() => {
    let alive = true;
    if (!token || !school || !courseId) return;
    // TODO: GET /api/:school/materials?course=courseId&semester=sem&kind=...
    setLoading(false);
    return () => { alive = false; };
  }, [token, school, courseId, sem, kind]);

  const kinds = useMemo(() => ["all", "note", "syllabus", "exam", "slide", "link"], []);

  return (
    <div className="p-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{decodeURIComponent(courseId)} · Materials</h1>
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
            const now = new Date(), y = now.getFullYear();
            const opts = Array.from(new Set([`${y-1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y+1}-spring`]));
            return opts.map((s) => <option key={s} value={s}>{s}</option>);
          })()}
        </select>

        <div className="flex gap-2">
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

        <div className="flex-1" />

        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate(schoolPath(`/courses/${encodeURIComponent(courseId)}/upload`))}
        >
          Upload
        </button>
      </div>

      {/* 빈 상태 (서버 붙이면 리스트로 대체) */}
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-600">
        Materials list will appear here once backend is connected.
      </div>
    </div>
  );
}
