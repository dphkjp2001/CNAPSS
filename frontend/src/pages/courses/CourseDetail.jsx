// frontend/src/pages/courses/CourseDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useSchool } from "../../contexts/SchoolContext";
import { useLoginGate } from "../../hooks/useLoginGate";
import {
  createReview,
  getCourseBreakdown,
  getCourseSummary,
  listCourseReviews,
} from "../../api/reviews";
import AsyncButton from "../../components/AsyncButton";

const SmallStat = ({ label, value, suffix = "" }) => (
  <div className="bg-white border rounded-xl p-3 text-center">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-semibold">
      {value == null ? "–" : value}
      {suffix}
    </div>
  </div>
);

export default function CourseDetail() {
  const { courseId: paramCourseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { school } = useSchool();
  const { ensureAuthed } = useLoginGate();

  // Accept from params or navigation state
  const [courseId, setCourseId] = useState(paramCourseId || location.state?.courseId || "");
  const [courseCode, setCourseCode] = useState(location.state?.courseCode || "");

  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState([]); // per professor
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    professorId: "",
    term: "",
    overall: 5,
    difficulty: 3,
    workload: 3,
    gradingStrictness: 3,
    usefulness: 3,
    wouldTakeAgain: true,
    comment: "",
  });

  const canSubmit = useMemo(() => {
    const ints = ["overall", "difficulty", "workload", "gradingStrictness", "usefulness"];
    return form.professorId && ints.every((k) => Number(form[k]) >= 1 && Number(form[k]) <= 5);
  }, [form]);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      setLoading(true);
      try {
        const [sum, bd, ls] = await Promise.all([
          getCourseSummary(school, courseId),
          getCourseBreakdown(school, courseId),
          listCourseReviews(school, courseId, { page: 1, limit: 10 }),
        ]);
        setSummary(sum || null);
        setBreakdown(Array.isArray(bd?.items) ? bd.items : []);
        setReviews(Array.isArray(ls?.items) ? ls.items : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, courseId]);

  async function submitReview() {
    const ok = await ensureAuthed();
    if (!ok) return;
    await createReview(school, {
      courseId,
      professorId: form.professorId,
      term: (form.term || "").toLowerCase().trim(),
      overall: Number(form.overall),
      difficulty: Number(form.difficulty),
      workload: Number(form.workload),
      gradingStrictness: Number(form.gradingStrictness),
      usefulness: Number(form.usefulness),
      wouldTakeAgain: !!form.wouldTakeAgain,
      comment: (form.comment || "").trim(),
    });
    setShowForm(false);
    setForm({
      professorId: "",
      term: "",
      overall: 5,
      difficulty: 3,
      workload: 3,
      gradingStrictness: 3,
      usefulness: 3,
      wouldTakeAgain: true,
      comment: "",
    });
    // refresh
    const [sum, bd, ls] = await Promise.all([
      getCourseSummary(school, courseId),
      getCourseBreakdown(school, courseId),
      listCourseReviews(school, courseId, { page: 1, limit: 10 }),
    ]);
    setSummary(sum || null);
    setBreakdown(Array.isArray(bd?.items) ? bd.items : []);
    setReviews(Array.isArray(ls?.items) ? ls.items : []);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Course Detail {courseCode ? `· ${courseCode}` : ""}</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50" onClick={() => setShowForm(true)}>
            ⭐ Write Review
          </button>
        </div>
      </div>

      {!courseId && (
        <div className="bg-yellow-50 border rounded-xl p-4 text-sm text-gray-700 mb-4">
          No courseId provided. Open this page from your Course Browser so the ID is passed in navigation.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <SmallStat label="Reviews" value={summary?.count ?? 0} />
        <SmallStat label="Overall" value={summary?.overallAvg} />
        <SmallStat label="Difficulty" value={summary?.difficultyAvg} />
        <SmallStat label="Workload" value={summary?.workloadAvg} />
        <SmallStat label="Grading" value={summary?.gradingStrictnessAvg} />
        <SmallStat label="Usefulness" value={summary?.usefulnessAvg} />
      </div>

      {/* Professor comparison */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Professor comparison (same course)</h2>
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {!loading && breakdown.length === 0 && (
          <div className="text-sm text-gray-500 border rounded-xl p-4 bg-white">No reviews yet.</div>
        )}
        <div className="grid gap-3">
          {breakdown.map((row) => (
            <article key={row.professor._id} className="bg-white border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {row.professor.name}{" "}
                  {row.professor.department ? <span className="text-gray-500">· {row.professor.department}</span> : null}
                </div>
                <button
                  className="text-sm px-3 py-1 rounded border"
                  onClick={() => navigate(`/${school}/professors/${row.professor._id}`)}
                >
                  View professor
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                <SmallStat label="Reviews" value={row.count} />
                <SmallStat label="Overall" value={row.overallAvg} />
                <SmallStat label="Difficulty" value={row.difficultyAvg} />
                <SmallStat label="Workload" value={row.workloadAvg} />
                <SmallStat label="Grading" value={row.gradingStrictnessAvg} />
                <SmallStat label="Usefulness" value={row.usefulnessAvg} />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Would take again:{" "}
                {row.wouldTakeAgainRate != null ? `${Math.round(row.wouldTakeAgainRate * 100)}%` : "–"}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Recent reviews */}
      <section>
        <h2 className="text-lg font-medium mb-2">Recent reviews</h2>
        {reviews.length === 0 && (
          <div className="text-sm text-gray-500 border rounded-xl p-4 bg-white">No reviews yet.</div>
        )}
        <div className="grid gap-3">
          {reviews.map((rv) => (
            <article key={rv._id} className="bg-white border rounded-2xl p-4">
              <header className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{rv?.professor?.name || "Professor"}</span>
                  {rv.term ? <span className="text-gray-500"> · {rv.term}</span> : null}
                </div>
                <time className="text-xs text-gray-500">{rv.createdAt ? dayjs(rv.createdAt).fromNow() : ""}</time>
              </header>
              <div className="mt-2 text-sm">
                Overall {rv.overall}/5 · Difficulty {rv.difficulty}/5 · Workload {rv.workload}/5 · Grading{" "}
                {rv.gradingStrictness}/5 · Usefulness {rv.usefulness}/5
              </div>
              {rv.comment ? <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{rv.comment}</p> : null}
              {rv.author?.username ? (
                <div className="mt-2 text-xs text-gray-500">by {rv.author.username}</div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {/* Write Review modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white border rounded-2xl p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Write a review</h3>
              <button className="text-sm px-2 py-1 border rounded" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>

            {/* Professor selector from breakdown (existing professors for this course) */}
            <label className="text-sm">Professor</label>
            <select
              className="w-full border rounded px-3 py-2 mb-2"
              value={form.professorId}
              onChange={(e) => setForm({ ...form, professorId: e.target.value })}
            >
              <option value="">Select professor…</option>
              {breakdown.map((row) => (
                <option key={row.professor._id} value={row.professor._id}>
                  {row.professor.name} {row.professor.department ? `(${row.professor.department})` : ""}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm">Term (e.g., 2025-fall)</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="2025-fall"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Overall</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full border rounded px-3 py-2"
                  value={form.overall}
                  onChange={(e) => setForm({ ...form, overall: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Difficulty</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full border rounded px-3 py-2"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Workload</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full border rounded px-3 py-2"
                  value={form.workload}
                  onChange={(e) => setForm({ ...form, workload: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Grading</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full border rounded px-3 py-2"
                  value={form.gradingStrictness}
                  onChange={(e) => setForm({ ...form, gradingStrictness: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm">Usefulness</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  className="w-full border rounded px-3 py-2"
                  value={form.usefulness}
                  onChange={(e) => setForm({ ...form, usefulness: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.wouldTakeAgain}
                  onChange={(e) => setForm({ ...form, wouldTakeAgain: e.target.checked })}
                />
                Would take again
              </label>
            </div>

            <div className="mt-2">
              <label className="text-sm">Comment (no links)</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                maxLength={2000}
                placeholder="Share your experience (no URLs; links are blocked)."
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>

            <div className="mt-3">
              <AsyncButton disabled={!canSubmit} onClick={submitReview}>
                Submit Review
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

