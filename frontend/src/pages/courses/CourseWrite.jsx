// frontend/src/pages/courses/CourseWrite.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import CourseCodePicker from "../../components/CourseCodePicker";
import { postJson } from "../../api/http";
import { useLoginGate } from "../../hooks/useLoginGate"; // ✅ 추가

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date();
  const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseWrite() {
  const { token } = useAuth();
  const { ensureAuth } = useLoginGate();       // ✅ 클릭 시점 게이트
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

  // Listing type: 'sale' | 'wanted'
  const [listingType, setListingType] = useState("sale");

  // Always personalMaterial
  const materialType = "personalMaterial";

  // offerings (multi check)
  const OFFERING_OPTIONS = [
    { value: "syllabus", label: "Syllabus" },
    { value: "exam", label: "Exams" },
    { value: "general", label: "General course content" },
    { value: "other", label: "Others" },
  ];
  const [offerings, setOfferings] = useState([]);
  const toggleOffering = (v) =>
    setOfferings((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );

  // kind은 내부 분류용 → 개인노트 기본
  const [kind] = useState("note");

  // Price & share
  const [priceStr, setPriceStr] = useState("");
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

  async function actuallySubmit() {
    if (!courseCode?.trim()) return setErr("Please select a course code.");
    if (!semester) return setErr("Please select a semester.");
    const prof = professor.trim();
    if (!prof) return setErr("Please enter the professor name.");

    // For Sale → price required and >= 1
    let price = 0;
    let isFree = true;
    if (listingType === "sale") {
      if (!priceStr.trim()) return setErr("Please enter a price.");
      const n = Number(priceStr);
      if (!Number.isFinite(n) || n < 1) {
        return setErr("Please enter a valid price (≥ 1).");
      }
      price = Math.floor(n);
      isFree = false;
    } else {
      price = 0;
      isFree = true;
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
        listingType,
        isFree,
        price,
        sharePreference,
        professor: prof,
        url: "",
        title: courseCode.toUpperCase(),
        offerings,
      };
      await postJson(`${API}/${encodeURIComponent(school)}/materials`, payload);
      navigate(schoolPath(`/courses`));
    } catch {
      setErr("Failed to create your posting. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    // ✅ 여기서만 로그인 요구: ensureAuth로 감싸기
    ensureAuth(async () => {
      await actuallySubmit();
    });
  }

  // price 입력 핸들러: 숫자만 허용
  const onPriceChange = (e) => {
    const v = e.target.value;
    const cleaned = v.replace(/[^\d]/g, "");
    setPriceStr(cleaned);
  };

  const onChangeListing = (t) => {
    setListingType(t);
    setPriceStr("");
  };

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
          {/* Listing type */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Listing type</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="listingType"
                  checked={listingType === "sale"}
                  onChange={() => onChangeListing("sale")}
                />
                For Sale
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="listingType"
                  checked={listingType === "wanted"}
                  onChange={() => onChangeListing("wanted")}
                />
                Wanted
              </label>
            </div>
          </div>

          {/* Course code */}
          <div>
            <label htmlFor="courseCodeInput" className="mb-1 block text-sm font-semibold">
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

          {/* Professor */}
          <div>
            <label className="mb-1 block text-sm font-semibold">
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

          {/* Semester */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Semester</label>
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

          {/* I'm offering … (multi check) */}
          <div>
            <div className="mb-1 text-sm font-semibold">What are you offering?</div>
            <div className="mb-2 text-sm text-gray-700">
              I’m offering my <span className="font-medium">personal course materials</span> regarding,
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OFFERING_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={offerings.includes(opt.value)}
                    onChange={() => toggleOffering(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div>
            <div className="mb-1 text-sm font-semibold">Warning</div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs leading-relaxed text-yellow-900">
              Professor-created materials are copyrighted by the professor.
              Please <b>do not buy or sell copyrighted materials</b> (e.g., full syllabus PDFs).
              Only share your own personal notes or summaries.
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Price</label>
            {listingType === "wanted" ? (
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600">
                This is a <b>Wanted</b> post. Price is not required.
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={1}
                    value={priceStr}
                    onChange={onPriceChange}
                    placeholder="Amount"
                    className="w-32 rounded-lg border px-3 py-2 pr-8 text-sm"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    $
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Share preference */}
          <div>
            <label className="mb-1 block text-sm font-semibold">How would you like to share?</label>
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
                Either
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(schoolPath(`/courses`))}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={
                "rounded-xl px-4 py-2 text-sm font-semibold text-white " +
                (busy ? "bg-gray-400" : "bg-violet-600 hover:bg-violet-700")
              }
              disabled={busy}
            >
              {busy ? "Submitting…" : "Submit"}
            </button>
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}



















