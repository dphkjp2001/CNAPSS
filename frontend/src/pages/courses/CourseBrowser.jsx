// src/pages/courses/CourseBrowser.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date(); const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseBrowser() {
  const { school } = useSchool();
  const { token } = useAuth();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  // 비로그인 차단은 라우트에서 이미 처리됨(RequireAuth). 여기선 안전한 가드만.
  const [sem, setSem] = useState(currentSemester());
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);       // 서버 붙이면 검색 결과
  const [loading, setLoading] = useState(false);

  // 서버 붙기 전까지는 빈 상태 유지(나중에 API 연결)
  useEffect(() => {
    let alive = true;
    if (!token || !school) return;
    // TODO: fetch(`${API}/api/${school}/courses/search?sem=${sem}&q=${query}`)
    setLoading(false);
    return () => { alive = false; };
  }, [token, school, sem, query]);

  const semesterOptions = useMemo(() => {
    const now = new Date(), y = now.getFullYear();
    return Array.from(new Set([`${y-1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y+1}-spring`]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-2 text-xl font-semibold">Course Browser</h1>
      <p className="mb-4 text-sm text-gray-600">
        Browse courses by semester. (Sign-in required: this page is gated.)
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={sem}
          onChange={(e) => setSem(e.target.value)}
          className="w-44 rounded-lg border px-3 py-2 text-sm"
        >
          {semesterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code or title (e.g., CS-UY 1133, Calculus)"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {/* 빈 상태 (서버 붙으면 리스트로 대체) */}
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-600">
        Search results will appear here once backend search is connected.
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate(schoolPath("/courses/upload"))}
        >
          Upload note
        </button>
      </div>
    </div>
  );
}
