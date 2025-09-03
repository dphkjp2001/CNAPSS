// frontend/src/pages/courses/CourseWrite.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import CourseCodePicker from "../../components/CourseCodePicker";
import { postJson } from "../../api/http";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date();
  const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseWrite() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const params = useParams();
  const [sp] = useSearchParams();

  const [courseCode, setCourseCode] = useState(
    decodeURIComponent(params.courseId || "")
  );
  const [semester, setSemester] = useState(sp.get("sem") || currentSemester());

  // REQUIRED: professor
  const [professor, setProfessor] = useState("");

  const [materialType, setMaterialType] = useState("personalMaterial");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  const [sharePreference, setSharePreference] = useState("either");
  const [kind, setKind] = useState("note");

  // ✅ Description 추가
  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const kindOptions = useMemo(
    () => [
      { ui: "class notes", value: "note" },
      { ui: "syllabus", value: "syllabus" },
      { ui: "exam", value: "exam" },
      { ui: "slide", value: "slide" },
      { ui: "link", value: "link" },
      { ui: "other", value: "other" },
    ],
    []
  );

  const semesterOptions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return Array.from(
      new Set([`${y - 1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y + 1}-spring`])
    );
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!token) return;

    if (!courseCode?.trim()) return setErr("Please select a course code.");
    if (!semester) return setErr("Please select a semester.");
    const prof = professor.trim();
    if (!prof) return setErr("Please enter the professor name.");
    if (!isFree && (Number.isNaN(price) || Number(price) < 1)) {
      return setErr("Please enter a valid price (≥ 1).");
    }

    try {
      setBusy(true);
      const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const payload = {
        courseCode: courseCode.toUpperCase(),
        courseTitle: "",
        semester,
        kind,
        materialType,
        isFree,
        price: Number(isFree ? 0 : price),
        sharePreference,
        professor: prof,
        // 업로드는 사용 안 함. url도 기본은 빈 값
        url: "",
        // ✅ 본문
        description: description.trim(),
        // 제목은 일단 코드로 채움(리스트에 간단히 보이도록)
        title: courseCode.toUpperCase(),
        tags: [],
      };
      await postJson(`${API}/${encodeURIComponent(school)}/materials`, payload);

      navigate(
        schoolPath(
          `/courses/${encodeURIComponent(
            courseCode.toUpperCase()
          )}/materials?sem=${encodeURIComponent(semester)}`
        )
      );
    } catch {
      setErr("Failed to create your posting. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Create a posting</h1>
        <p className="mb-4 text-sm text-gray-600">
          This posting does not require a file. You can share details later through messages.
        </p>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
          {/* Course code (required) */}
          <div>
            <label htmlFor="courseCodeInput" className="mb-1 block text-sm font-medium">
              Course code <span className="text-red-600">*</span>
            </label>
            <CourseCodePicker
              id="courseCodeInput"
              school={school}
              value={courseCode}
              onChange={setCourseCode}
              required
            />
          </div>

          {/* Professor (required) */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Professor <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              placeholder="e.g., Jonathan Hopper"
              maxLength={80}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* Semester & kind */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="sm:w-1/2">
              <label className="mb-1 block text-sm font-medium">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {semesterOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:w-1/2">
              <label className="mb-1 block text-sm font-medium">Legacy type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {kindOptions.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.ui}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="mb-1 block text-sm font-medium">Price</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="priceType"
                  checked={isFree}
                  onChange={() => setIsFree(true)}
                />
                Free
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="priceType"
                  checked={!isFree}
                  onChange={() => setIsFree(false)}
                />
                Paid
              </label>
              <input
                type="number"
                min={1}
                step="1"
                disabled={isFree}
                value={isFree ? "" : price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Amount"
                className="w-28 rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Share preference */}
          <div>
            <label className="mb-1 block text-sm font-medium">How would you like to share?</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sharePref"
                  value="in_person"
                  checked={sharePreference === "in_person"}
                  onChange={(e) => setSharePreference(e.target.value)}
                />
                In person
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sharePref"
                  value="online"
                  checked={sharePreference === "online"}
                  onChange={(e) => setSharePreference(e.target.value)}
                />
                Online
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sharePref"
                  value="either"
                  checked={sharePreference === "either"}
                  onChange={(e) => setSharePreference(e.target.value)}
                />
                Doesn't matter
              </label>
            </div>
          </div>

          {/* ✅ Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any helpful details here…"
              rows={5}
              className="w-full resize-y rounded-lg border px-3 py-2 text-sm"
            />
            <div className="mt-1 text-xs text-gray-500">
              Tip: Clear descriptions help the uploader and buyer communicate faster.
            </div>
          </div>

          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}








