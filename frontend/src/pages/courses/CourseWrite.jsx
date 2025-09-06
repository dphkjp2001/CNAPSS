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

  // REQUIRED
  const [professor, setProfessor] = useState("");

  // Listing type: For Sale / Wanted  ✅ 추가
  const [listingType, setListingType] = useState("sale"); // 'sale' | 'wanted'

  // 1) What are you offering?
  const [materialType, setMaterialType] = useState("personalMaterial"); // personalNote | personalMaterial
  // 2) Regarding (only for personalMaterial)
  const materialKindOptions = useMemo(
    () => [
      { ui: "syllabus", value: "syllabus" },
      { ui: "exam", value: "exam" },
      { ui: "slide", value: "slide" },
      { ui: "link", value: "link" },
      { ui: "other", value: "other" },
    ],
    []
  );
  const [kind, setKind] = useState("note"); // auto-forced to "note" when personalNote

  // Price & share
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  const [sharePreference, setSharePreference] = useState("either");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const semesterOptions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    return Array.from(
      new Set([
        `${y - 1}-fall`,
        `${y}-spring`,
        `${y}-summer`,
        `${y}-fall`,
        `${y + 1}-spring`,
      ])
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
    if (
      listingType === "sale" &&
      !isFree &&
      (Number.isNaN(price) || Number(price) < 1)
    ) {
      return setErr("Please enter a valid price (≥ 1).");
    }

    // enforce kind policy on client as well
    const _kind =
      materialType === "personalNote" ? "note" : (kind || "other");

    try {
      setBusy(true);
      const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const payload = {
        courseCode: courseCode.toUpperCase(),
        courseTitle: "",
        semester,
        kind: _kind,
        materialType,
        // ✅ listingType 포함
        listingType, // 'sale' | 'wanted'
        // Wanted일 땐 무조건 무료로 처리
        isFree: listingType === "wanted" ? true : isFree,
        price:
          listingType === "wanted" ? 0 : Number(isFree ? 0 : price),
        sharePreference,
        professor: prof,
        url: "",
        // description, tags intentionally omitted
        title: courseCode.toUpperCase(),
      };
      await postJson(
        `${API}/${encodeURIComponent(school)}/materials`,
        payload
      );

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

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm"
        >
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

          {/* Semester & Listing type */}
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

            {/* ✅ Listing type */}
            <div className="sm:w-1/2">
              <label className="mb-1 block text-sm font-medium">Listing type</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="listingType"
                    checked={listingType === "sale"}
                    onChange={() => setListingType("sale")}
                  />
                  For Sale
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="listingType"
                    checked={listingType === "wanted"}
                    onChange={() => setListingType("wanted")}
                  />
                  Wanted
                </label>
              </div>
            </div>
          </div>

          {/* What are you offering? */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              What are you offering?
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="offerType"
                  checked={materialType === "personalNote"}
                  onChange={() => {
                    setMaterialType("personalNote");
                    setKind("note");
                  }}
                />
                Personal Class Note
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="offerType"
                  checked={materialType === "personalMaterial"}
                  onChange={() => {
                    setMaterialType("personalMaterial");
                    // default to 'other' for material
                    setKind("other");
                  }}
                />
                Personal Class Material
              </label>
            </div>
          </div>

          {/* Regarding (kind) – only for personalMaterial */}
          {materialType === "personalMaterial" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Regarding…</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {materialKindOptions.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.ui}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Kind is fixed to <b>note</b> for Personal Class Note.
            </div>
          )}

          {/* Price (Wanted일 땐 비활성/숨김) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Price</label>
            {listingType === "wanted" ? (
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600">
                This is a <b>Wanted</b> post. Price is not required.
              </div>
            ) : (
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
            )}
          </div>

          {/* Share preference */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              How would you like to share?
            </label>
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










