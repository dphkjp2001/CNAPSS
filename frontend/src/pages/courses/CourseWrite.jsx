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
  const { school } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const params = useParams();
  const [sp] = useSearchParams();

  // Preselect from URL when available
  const [courseCode, setCourseCode] = useState(
    decodeURIComponent(params.courseId || "")
  );
  const [semester, setSemester] = useState(sp.get("sem") || currentSemester());

  // Frame 9 fields
  const [materialType, setMaterialType] = useState("personalMaterial"); // personalMaterial | personalNote
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  const [sharePreference, setSharePreference] = useState("either"); // in_person | online | either

  // Legacy kind (for compatibility with listing filter)
  const [kind, setKind] = useState("note"); // note | syllabus | exam | slide | link | other

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
    if (!isFree && (Number.isNaN(price) || Number(price) < 1)) {
      return setErr("Please enter a valid price (≥ 1).");
    }

    try {
      setBusy(true);

      const payload = {
        courseCode: courseCode.toUpperCase(),
        courseTitle: "", // optional
        semester,
        // legacy kind for compatibility with list filter
        kind,
        // Frame 9 fields
        materialType,
        isFree,
        price: Number(isFree ? 0 : price),
        sharePreference,
        // listing only; no file/url now
        url: "",
        fileUrl: "",
        filePublicId: "",
        fileMime: "",
        fileSize: 0,
        title: courseCode.toUpperCase(),
        tags: [],
      };

      // ✅ IMPORTANT: VITE_API_URL already ends with "/api"
      // so DO NOT prepend another "/api" here.
      const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
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
    <div className="max-w-2xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Create a posting</h1>
      <p className="mb-4 text-sm text-gray-600">
        This posting does not require a file. You can share details later through messages.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Course + Semester */}
        <div>
          <label className="mb-1 block text-sm font-medium">Course code (required)</label>
          <CourseCodePicker school={school} value={courseCode} onChange={setCourseCode} />
        </div>

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

        {/* Material type */}
        <div>
          <label className="mb-1 block text-sm font-medium">What are you posting?</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="materialType"
                value="personalMaterial"
                checked={materialType === "personalMaterial"}
                onChange={(e) => setMaterialType(e.target.value)}
              />
              Personal Class Material
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="materialType"
                value="personalNote"
                checked={materialType === "personalNote"}
                onChange={(e) => setMaterialType(e.target.value)}
              />
              Personal Class Note
            </label>
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
              min="1"
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

        {/* Error */}
        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Actions */}
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
  );
}




