// src/pages/schedule/GroupAvailability.jsx
import React, { useMemo, useState } from "react";
import ScheduleGrid from "./ScheduleGrid";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { getGroupFree } from "../../api/schedule";

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
  const seed = [`${y - 1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y + 1}-spring`];
  return Array.from(new Set(seed));
}

const keyOf = (s) => `${s.day}-${s.start}-${s.end}`;

export default function GroupAvailability() {
  const { token } = useAuth();
  const { school } = useSchool();

  const [membersInput, setMembersInput] = useState("");
  const [semester, setSemester] = useState(currentSemesterString());
  const semesterOptions = useMemo(buildSemesterOptions, []);

  const [minMinutes, setMinMinutes] = useState(30);
  const [windows, setWindows] = useState([]); // common free windows → show on grid
  const [missing, setMissing] = useState([]); // members without saved schedules
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onCompare = async () => {
    if (!token || !school) return;
    setLoading(true);
    setErr("");
    setWindows([]);
    setMissing([]);

    try {
      const raw = membersInput
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const data = await getGroupFree({
        school,
        token,
        semester,
        members: raw,
        min: minMinutes,
      });

      const wins = Array.isArray(data?.windows) ? data.windows : [];
      const miss = Array.isArray(data?.missing) ? data.missing : [];

      // map to grid blocks
      const blocks = wins.map((w) => ({
        day: w.day,
        start: w.start,
        end: w.end,
        label: "FREE",
        class_number: `free-${keyOf(w)}`,
      }));

      setWindows(blocks);
      setMissing(miss);
    } catch (e) {
      console.error("Compare failed:", e);
      setErr("Failed to compare schedules. Make sure members are from the same school and saved.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-2 text-xl font-semibold">Group Availability</h1>
      <p className="mb-4 text-sm text-gray-500">
        Find common free times among your team for the selected semester.
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Semester</label>
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
        </div>

        <div className="sm:ml-4">
          <label className="mb-1 block text-sm text-gray-600">Members (emails)</label>
          <input
            type="text"
            placeholder="friend1@school.edu, friend2@school.edu"
            className="w-[360px] rounded-lg border px-3 py-1.5 text-sm"
            value={membersInput}
            onChange={(e) => setMembersInput(e.target.value)}
          />
        </div>

        <div className="sm:ml-4">
          <label className="mb-1 block text-sm text-gray-600">Min free window (minutes)</label>
          <input
            type="number"
            min={15}
            step={15}
            className="w-28 rounded-lg border px-3 py-1.5 text-sm"
            value={minMinutes}
            onChange={(e) => setMinMinutes(Math.max(15, parseInt(e.target.value || "30", 10)))}
          />
        </div>

        <div className="sm:ml-4">
          <button
            onClick={onCompare}
            disabled={loading || !token}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Checking..." : "Compare"}
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {!!missing.length && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The following members don’t have a saved schedule for <b>{semester}</b>:{" "}
          <span className="font-mono">{missing.join(", ")}</span>
        </div>
      )}

      <ScheduleGrid schedules={windows} />
    </div>
  );
}


