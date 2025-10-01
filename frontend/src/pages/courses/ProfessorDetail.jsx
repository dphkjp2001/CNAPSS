// frontend/src/pages/courses/ProfessorDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { getProfessorBreakdown } from "../../api/reviews";

function Stat({ label, value }) {
  return (
    <div className="bg-white border rounded-xl p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value == null ? "–" : value}</div>
    </div>
  );
}

export default function ProfessorDetail() {
  const { professorId } = useParams();
  const { school } = useSchool();
  const navigate = useNavigate();

  const [breakdown, setBreakdown] = useState([]); // per course
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!professorId) return;
    (async () => {
      setLoading(true);
      try {
        const bd = await getProfessorBreakdown(school, professorId);
        setBreakdown(Array.isArray(bd?.items) ? bd.items : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, professorId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Professor</h1>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {!loading && breakdown.length === 0 && (
        <div className="text-sm text-gray-500 border rounded-xl p-4 bg-white">No reviews yet.</div>
      )}

      <div className="grid gap-3">
        {breakdown.map((row) => (
          <article key={row.course._id} className="bg-white border rounded-2xl p-4">
            <header className="flex items-center justify-between">
              <div className="font-medium">
                {row.course.code} · {row.course.title}
              </div>
              <button
                className="text-sm px-3 py-1 rounded border"
                onClick={() =>
                  navigate(`/${school}/courses/${row.course._id}`, {
                    state: { courseId: row.course._id, courseCode: row.course.code },
                  })
                }
              >
                View course
              </button>
            </header>

            <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
              <Stat label="Reviews" value={row.count} />
              <Stat label="Overall" value={row.overallAvg} />
              <Stat label="Difficulty" value={row.difficultyAvg} />
              <Stat label="Workload" value={row.workloadAvg} />
              <Stat label="Grading" value={row.gradingStrictnessAvg} />
              <Stat label="Usefulness" value={row.usefulnessAvg} />
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Would take again: {row.wouldTakeAgainRate != null ? `${Math.round(row.wouldTakeAgainRate * 100)}%` : "–"}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

