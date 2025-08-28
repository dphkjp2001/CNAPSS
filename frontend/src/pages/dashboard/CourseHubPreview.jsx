// src/pages/dashboard/CourseHubPreview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getMySchedule } from "../../api/schedule";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
function currentSemesterString() {
  const now = new Date();
  const y = now.getFullYear();
  const t = termOfMonth(now.getMonth() + 1);
  return `${y}-${t}`;
}

export default function CourseHubPreview({
  school,
  primary = "#6b46c1",
  textColor = "#111827",
  ensureAuth,
  schoolPath,
  navigate,
}) {
  const { token } = useAuth();
  const [semester, setSemester] = useState(currentSemesterString());
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]); // unique course codes from my schedule

  // pull my course codes from saved schedule (login required)
  useEffect(() => {
    let alive = true;
    if (!token || !school || !semester) {
      setCourses([]);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const data = await getMySchedule({ school, token, semester });
        const slots = Array.isArray(data?.slots) ? data.slots : [];
        const uniq = Array.from(
          new Set(
            slots
              .map((s) => (s.label || "").trim())
              .filter(Boolean)
          )
        ).slice(0, 5);
        if (alive) setCourses(uniq);
      } catch {
        if (alive) setCourses([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, school, semester]);

  const semesterOptions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return Array.from(
      new Set([`${y - 1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y + 1}-spring`])
    );
  }, []);

  return (
    <div className="h-full rounded-2xl border border-sand bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: textColor }}>
          Course Hub
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="rounded-lg border px-2 py-1 text-xs"
            title="Semester"
          >
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => ensureAuth(() => navigate(schoolPath("/courses")))}
            className="text-sm text-blue-600 hover:underline"
          >
            Browse all
          </button>
        </div>
      </div>

      {!token ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
          Sign in to see quick links to <b>your courses</b> this semester.
        </div>
      ) : loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="animate-pulse">
              <div className="h-5 w-3/4 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
            </li>
          ))}
        </ul>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
          No courses in your <b>{semester}</b> schedule yet.
          <button
            onClick={() => ensureAuth(() => navigate(schoolPath("/personal-schedule")))}
            className="ml-2 inline-flex items-center underline"
          >
            Add courses →
          </button>
        </div>
      ) : (
        <ul className="divide-y">
          {courses.map((code) => (
            <li key={code} className="py-3">
              <button
                className="block w-full text-left"
                onClick={() =>
                  ensureAuth(() =>
                    navigate(schoolPath(`/courses/${encodeURIComponent(code)}/materials`))
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{code}</div>
                  <div className="ml-3 shrink-0 text-xs text-gray-500">open materials</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => ensureAuth(() => navigate(schoolPath("/courses/upload")))}
          className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Upload note
        </button>
        <button
          onClick={() => ensureAuth(() => navigate(schoolPath("/courses")))}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          Open Course Hub
        </button>
      </div>
    </div>
  );
}
