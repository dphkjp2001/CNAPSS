// src/pages/schedule/PersonalSchedule.jsx
import React, { useState, useEffect, useMemo } from "react";
import ScheduleGrid from "./ScheduleGrid";
import CourseSearch from "./CourseSearch";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { getMySchedule, saveMySchedule } from "../../api/schedule";

// Parse "MTWRF 9:30a-12:30p" → blocks for grid
function parseMeeting(meetingStr, label, class_number) {
  if (!meetingStr) return [];
  const regex = /([MTWRF]+)\s(\d{1,2})(?::(\d{2}))?(a|p)?-(\d{1,2})(?::(\d{2}))?(a|p)/i;
  const match = meetingStr.match(regex);
  if (!match) return [];

  const dayStr = match[1];
  const startHour = parseInt(match[2]);
  const startMin = parseInt(match[3] || "0");
  const startMeridiemRaw = match[4];
  const endHourRaw = parseInt(match[5]);
  const endMin = parseInt(match[6] || "0");
  const endMeridiem = match[7].toLowerCase();
  const startMeridiem = (startMeridiemRaw || endMeridiem).toLowerCase();

  const startHour24 = startHour % 12 + (startMeridiem === "p" ? 12 : 0);
  const endHour24 = endHourRaw % 12 + (endMeridiem === "p" ? 12 : 0);

  const start = `${startHour24.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;
  const end = `${endHour24.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;

  const dayMap = { M: "MON", T: "TUE", W: "WED", R: "THU", F: "FRI" };

  return dayStr.split("").map((d) => ({
    day: dayMap[d],
    start,
    end,
    label,
    class_number,
  }));
}

// slot key helper
const keyOf = (s) => `${s.day}-${s.start}-${s.end}`;

// semester helpers
const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
function currentSemesterString() {
  const now = new Date();
  const y = now.getFullYear();
  const t = termOfMonth(now.getMonth() + 1);
  return `${y}-${t}`;
}
function buildSemesterOptions() {
  const now = new Date();
  const y = now.getFullYear();
  const opts = [];
  const terms = ["spring", "summer", "fall"];
  // last year fall → this year (spring/summer/fall) → next year spring
  const seed = [
    `${y - 1}-fall`,
    `${y}-spring`,
    `${y}-summer`,
    `${y}-fall`,
    `${y + 1}-spring`,
  ];
  for (const s of seed) if (!opts.includes(s)) opts.push(s);
  return opts;
}

function PersonalSchedule() {
  const { school } = useSchool();
  const { token } = useAuth();
  const schoolPath = useSchoolPath();
  const [courseList, setCourseList] = useState([]);
  const [selected, setSelected] = useState([]); // [{day,start,end,label,class_number}]
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");

  const isNYU = (school || "").toLowerCase() === "nyu";

  const semesterOptions = useMemo(buildSemesterOptions, []);
  const [semester, setSemester] = useState(currentSemesterString());

  // Load my saved schedule for this semester
  useEffect(() => {
    let alive = true;
    if (!school || !token || !semester) return;

    (async () => {
      try {
        setError("");
        const data = await getMySchedule({ school, token, semester });
        const slots = Array.isArray(data?.slots) ? data.slots : [];

        // Map saved slots to grid blocks with stable pseudo class_number
        const mapped = slots.map((s) => ({
          day: s.day,
          start: s.start,
          end: s.end,
          label: "Saved",
          class_number: `saved-${keyOf(s)}`,
        }));
        if (alive) setSelected(mapped);
      } catch (e) {
        console.warn("Load schedule failed:", e);
        if (alive) setSelected([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [school, token, semester]);

  // Load NYU course data only when school === "nyu"
  useEffect(() => {
    let alive = true;

    if (!isNYU) {
      setCourseList([]);
      return () => {};
    }

    setLoadingCourses(true);
    fetch("/NYU_course_DATA.json")
      .then((res) => res.json())
      .then((data) => {
        if (alive) setCourseList(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Failed to load course data:", err))
      .finally(() => {
        if (alive) setLoadingCourses(false);
      });

    return () => {
      alive = false;
    };
  }, [isNYU]);

  const handleAddCourse = (section) => {
    const isAlreadyAdded = selected.some(
      (s) => s.label === section.course_code && s.class_number === section.class_number
    );

    if (isAlreadyAdded) {
      setSelected((prev) => prev.filter((s) => s.class_number !== section.class_number));
    } else {
      const slots = parseMeeting(section.meets, section.course_code, section.class_number);

      // conflict detection
      const isConflict = slots.some((newSlot) =>
        selected.some(
          (existing) =>
            existing.day === newSlot.day &&
            !(newSlot.end <= existing.start || newSlot.start >= existing.end)
        )
      );

      if (isConflict) {
        const confirmReplace = window.confirm(
          "This course conflicts with an existing one. Replace conflicting blocks with this course?"
        );
        if (!confirmReplace) return;

        const conflictClassNumbers = slots
          .flatMap((newSlot) =>
            selected.filter(
              (existing) =>
                existing.day === newSlot.day &&
                !(newSlot.end <= existing.start || newSlot.start >= existing.end)
            )
          )
          .map((s) => s.class_number);

        const filtered = selected.filter((s) => !conflictClassNumbers.includes(s.class_number));
        setSelected([...filtered, ...slots]);
        return;
      }

      setSelected((prev) => [...prev, ...slots]);
    }
  };

  const handleRemoveCourse = (class_number) => {
    setSelected((prev) => prev.filter((s) => s.class_number !== class_number));
  };

  // Normalize to unique {day,start,end}
  const toSlotsPayload = () => {
    const map = new Map();
    for (const s of selected) {
      const key = keyOf(s);
      map.set(key, { day: s.day, start: s.start, end: s.end });
    }
    return Array.from(map.values());
  };

  const onSave = async () => {
    if (!token || !school || !semester) return;
    try {
      setSaving(true);
      setSaveMsg("");
      setError("");

      const slots = toSlotsPayload();
      await saveMySchedule({ school, token, semester, slots });
      setSaveMsg("Saved your schedule for this semester.");
    } catch (e) {
      console.error("Save failed:", e);
      setError("Failed to save schedule. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Personal Schedule Builder</h1>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {semesterOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <button
            onClick={onSave}
            disabled={saving || !token}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {!isNYU && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="mb-1 font-semibold">Course search is NYU-only (MVP) for now.</div>
          <p>
            We don’t have course data for <b>{(school || "").toUpperCase()}</b> yet.
            You can still save a schedule by adding blocks manually once we add that UI;
            for now, only NYU course search can auto-add blocks.
          </p>
          <a href={schoolPath("/dashboard")} className="mt-2 inline-block text-blue-600 underline">
            ← Back to Dashboard
          </a>
        </div>
      )}

      {saveMsg && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {saveMsg}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-6">
        <div className="w-3/12">
          {/* Search (NYU only) */}
          {isNYU ? (
            loadingCourses ? (
              <div className="text-sm text-gray-500">Loading course list…</div>
            ) : (
              <CourseSearch data={courseList} onSelect={handleAddCourse} />
            )
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
              Course search is unavailable for this school.
            </div>
          )}
        </div>

        <div className="w-9/12">
          <ScheduleGrid schedules={selected} onRemove={handleRemoveCourse} />
        </div>
      </div>
    </div>
  );
}

export default PersonalSchedule;




