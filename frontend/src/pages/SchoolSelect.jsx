// 📁 frontend/src/pages/SchoolSelect.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../contexts/SchoolContext";

const SCHOOLS = [
  { value: "nyu", label: "NYU", color: "#8b5cf6" },
  { value: "columbia", label: "Columbia", color: "#0ea5e9" },
  { value: "boston", label: "Boston", color: "#ef4444" },
];

export default function SchoolSelect() {
  const navigate = useNavigate();
  const { setSchool } = useSchool?.() || { setSchool: () => {} };

  const choose = (value) => {
    // 1) 앱 전역(컨텍스트)에 학교 반영 (가능한 경우)
    try {
      setSchool?.(value);
    } catch (_) {}

    // 2) 게스트 유지용 로컬 저장
    localStorage.setItem("lastVisitedSchool", value);

    // 3) 해당 학교 대시보드로 이동 (게스트 프리뷰 OK)
    navigate(`/${value}/dashboard`, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Choose Your School
        </h1>
        <div className="flex items-center justify-center gap-4">
          {SCHOOLS.map((s) => (
            <button
              key={s.value}
              onClick={() => choose(s.value)}
              className="rounded-full px-6 py-2 text-white font-semibold shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ backgroundColor: s.color }}
              aria-label={`Select ${s.label}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs text-gray-500">
          You can browse as a guest. Sign up later to post or chat.
        </p>
      </div>
    </div>
  );
}
