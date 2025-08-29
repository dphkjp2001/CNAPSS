// frontend/src/pages/courses/CourseBrowser.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import CourseCodePicker from "../../components/CourseCodePicker";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date();
  const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseBrowser() {
  const { school } = useSchool();
  const { token } = useAuth();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  // search inputs
  const [courseQuery, setCourseQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [instructorQuery, setInstructorQuery] = useState("");

  // semester (backend requires this for materials list)
  const [semester, setSemester] = useState(currentSemester());
  const semesterOptions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return Array.from(
      new Set([`${y - 1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y + 1}-spring`])
    );
  }, []);

  // data state
  const [courses, setCourses] = useState([]); // search results for courses
  const [materials, setMaterials] = useState([]); // materials for the selected course & semester
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [error, setError] = useState("");

  const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  // search courses (server)
  const fetchCourses = useCallback(
    async (q) => {
      if (!token || !school) return;
      setLoadingCourses(true);
      setError("");
      try {
        const res = await fetch(
          `${API}/api/${encodeURIComponent(school)}/courses/search?q=${encodeURIComponent(q || "")}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to search courses");
        const json = await res.json();
        setCourses(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        setCourses([]);
        setError("Failed to load course search results.");
      } finally {
        setLoadingCourses(false);
      }
    },
    [API, token, school]
  );

  // load materials for a selected course+semester (server)
  const fetchMaterials = useCallback(
    async (code) => {
      if (!token || !school || !code) {
        setMaterials([]);
        return;
      }
      setLoadingMaterials(true);
      setError("");
      try {
        const url =
          `${API}/api/${encodeURIComponent(school)}/materials` +
          `?course=${encodeURIComponent(code)}` +
          `&semester=${encodeURIComponent(semester)}` +
          `&kind=all&sort=new&page=1&limit=50`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to load materials");
        const json = await res.json();
        setMaterials(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        setMaterials([]);
        setError("Failed to load materials.");
      } finally {
        setLoadingMaterials(false);
      }
    },
    [API, token, school, semester]
  );

  // when a course is chosen, fetch materials
  useEffect(() => {
    if (selectedCourse) fetchMaterials(selectedCourse);
  }, [selectedCourse, fetchMaterials]);

  // optional client-side filter by "instructor" text.
  // (Backend doesn't have instructor field yet; later we can wire it when schema updates.)
  const visibleMaterials = useMemo(() => {
    const q = (instructorQuery || "").trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((m) => {
      // best-effort: try to match against title or authorName
      const hay =
        `${m.title || ""} ${m.authorName || ""} ${m.uploaderEmail || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [materials, instructorQuery]);

  const onSearchCourse = () => {
    if (!courseQuery?.trim()) return;
    fetchCourses(courseQuery.trim());
  };

  const onPickCourse = (code) => {
    setSelectedCourse(code?.toUpperCase() || "");
    setCourseQuery(code?.toUpperCase() || "");
    // materials will auto-load by effect
  };

  return (
    <div className="p-6">
      <h1 className="mb-2 text-xl font-semibold">CourseHub</h1>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="w-44 rounded-lg border px-3 py-2 text-sm"
        >
          {semesterOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Course search with picker */}
        <div className="flex w-full items-center gap-2">
          <div className="w-full">
            <CourseCodePicker
              school={school}
              value={courseQuery}
              onChange={(v) => setCourseQuery(v)}
              placeholder="Search the Course"
            />
          </div>
          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={onSearchCourse}
            disabled={loadingCourses}
          >
            {loadingCourses ? "Searching…" : "search"}
          </button>
        </div>

        {/* optional instructor filter */}
        <div className="flex w-full items-center gap-2">
          <input
            value={instructorQuery}
            onChange={(e) => setInstructorQuery(e.target.value)}
            placeholder="name of the instructor (optional)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() => {
              // no extra network; just triggers memoized filter by state change
              setInstructorQuery((v) => v.trim());
            }}
          >
            search
          </button>
        </div>

        <div className="flex-1" />

        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate(schoolPath("/courses/write"))}
        >
          Create Posting
        </button>
      </div>

      {/* Course search results (click → choose course & load materials) */}
      {courseQuery?.trim() && (
        <div className="mb-4 rounded-xl border bg-white">
          <div className="border-b p-3 text-xs text-gray-500">
            Course search results
            {selectedCourse ? (
              <span className="ml-2 text-gray-400">
                (selected: <b>{selectedCourse}</b>)
              </span>
            ) : null}
          </div>
          <ul className="max-h-56 divide-y overflow-auto">
            {(courses || []).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 " +
                    (selectedCourse === c.code ? "bg-blue-50" : "")
                  }
                  onClick={() => onPickCourse(c.code)}
                >
                  <div>
                    <div className="text-sm font-medium">{c.code}</div>
                    {c.title ? (
                      <div className="text-xs text-gray-500 line-clamp-1">{c.title}</div>
                    ) : null}
                  </div>
                  <span className="text-xs text-blue-600">Select</span>
                </button>
              </li>
            ))}
            {!loadingCourses && courses.length === 0 && (
              <li className="p-3 text-sm text-gray-500">No courses found.</li>
            )}
          </ul>
        </div>
      )}

      {/* Materials list */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm">
            {selectedCourse ? (
              <>
                <b>{selectedCourse}</b> · <span className="text-gray-500">{semester}</span>
              </>
            ) : (
              <span className="text-gray-500">Select a course to see materials</span>
            )}
          </div>
          {selectedCourse && (
            <button
              className="text-xs text-blue-600 underline"
              onClick={() =>
                navigate(
                  schoolPath(
                    `/courses/${encodeURIComponent(selectedCourse)}/materials?sem=${encodeURIComponent(
                      semester
                    )}`
                  )
                )
              }
            >
              Open full list
            </button>
          )}
        </div>

        {/* list body */}
        {!selectedCourse ? (
          <div className="p-6 text-sm text-gray-600">
            Search and select a course to view materials.
          </div>
        ) : loadingMaterials ? (
          <div className="p-6 text-sm text-gray-600">Loading materials…</div>
        ) : visibleMaterials.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No materials found for this course.</div>
        ) : (
          <ul className="divide-y">
            {visibleMaterials.map((m) => (
              <li key={m.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {m.kind ? m.kind.toUpperCase() : "MATERIAL"} ·{" "}
                      <span className="text-gray-700">{m.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      by {m.authorName || m.uploaderEmail || "Unknown"} ·{" "}
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                    {(m.url || m.fileUrl) && (
                      <div className="mt-1 text-xs">
                        {m.url ? (
                          <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            external link
                          </a>
                        ) : (
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            file
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs text-gray-500">
                      ❤ {m.likeCount || 0} · 👁 {m.viewCount || 0}
                    </div>
                    <button
                      className="mt-2 rounded-lg border px-2 py-1 text-xs"
                      onClick={() =>
                        navigate(
                          schoolPath(
                            `/courses/${encodeURIComponent(selectedCourse)}/materials?sem=${encodeURIComponent(
                              semester
                            )}`
                          )
                        )
                      }
                    >
                      View
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

