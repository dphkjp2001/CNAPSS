// frontend/src/pages/courses/CourseWrite.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { createMaterial } from "../../api/materials";
import CourseCodePicker from "../../components/CourseCodePicker";

const SEMESTERS = ["2025-spring", "2025-summer", "2025-fall", "2025-winter"];

export default function CourseWrite() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const nav = useNavigate();
  const schoolPath = useSchoolPath();

  const [listingType, setListingType] = useState("sale"); // sale|wanted
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [professor, setProfessor] = useState("");
  const [semester, setSemester] = useState("2025-fall");

  // optional meta
  const [offerings, setOfferings] = useState([]); // ["syllabus","exam","general","other"]
  const [regarding, setRegarding] = useState("");

  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState(0);
  const [sharePreference, setSharePreference] = useState("either"); // in_person | online | either

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const titleAuto = useMemo(() => {
    const base = [courseCode, courseTitle].filter(Boolean).join(" — ");
    return base || courseCode || "";
  }, [courseCode, courseTitle]);

  const onToggleOffering = (key) => {
    setOfferings((prev) =>
      prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!courseCode || !professor || !semester) {
      setErrorMsg("Please fill in required fields.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        listingType,
        courseCode: String(courseCode).toUpperCase(),
        courseTitle: courseTitle || "",
        professor,
        semester,
        // kind는 서버에서 기본값 처리(note/other)
        title: titleAuto || courseCode,
        isFree: !!isFree,
        price: isFree ? 0 : Math.max(1, Number(price || 0)),
        sharePreference,
        offerings,
        regarding,
      };
      const res = await createMaterial({ school, token, payload });
      if (res?.id) {
        nav(schoolPath(`/courses/materials/${res.id}`));
      } else {
        nav(schoolPath(`/courses`));
      }
    } catch (e2) {
      console.error(e2);
      setErrorMsg(e2?.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-gray-900">Create a listing</h1>

        {/* listing type */}
        <div>
          <div className="mb-2 text-sm font-medium text-gray-900">Listing type</div>
          <div className="flex gap-6 text-sm">
            {["sale", "wanted"].map((t) => (
              <label key={t} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="listingType"
                  value={t}
                  checked={listingType === t}
                  onChange={() => setListingType(t)}
                />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* course */}
        <div>
          <label htmlFor="course" className="mb-1 block text-sm font-medium text-gray-900">
            Course code *
          </label>
          <CourseCodePicker
            id="course"
            school={school}
            value={courseCode}
            onChange={(v) => setCourseCode(String(v || "").toUpperCase())}
            onSelect={(item) => {
              // item: { code, title }
              setCourseCode(String(item?.code || "").toUpperCase());
              setCourseTitle(item?.title || "");
            }}
            placeholder="Search course code or title (e.g., CAMS-UA 148, Calculus)"
            required
          />
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">Course title</label>
              <input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g., Introduction to Film"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">Professor *</label>
              <input
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="e.g., Jonathan Hopper"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* semester */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Semester *</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            required
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* offerings/regarding */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 block text-sm font-medium text-gray-900">What are you offering?</div>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                ["syllabus", "Syllabus"],
                ["exam", "Exams"],
                ["general", "General course content"],
                ["other", "Others"],
              ].map(([k, label]) => (
                <label key={k} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={offerings.includes(k)}
                    onChange={() => onToggleOffering(k)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Regarding</label>
            <input
              value={regarding}
              onChange={(e) => setRegarding(e.target.value)}
              placeholder="Topic/keywords…"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* price/share */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 block text-sm font-medium text-gray-900">Price</div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                />
                <span>Free</span>
              </label>
              {!isFree && (
                <div className="flex items-center gap-2">
                  <span className="rounded-md border px-2 py-1 text-sm text-gray-600">$</span>
                  <input
                    type="number"
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-28 rounded-lg border px-3 py-2 text-sm"
                    placeholder="Amount"
                  />
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-gray-900">How would you like to share?</div>
            <div className="flex gap-6 text-sm">
              {[
                ["in_person", "In person"],
                ["online", "Online"],
                ["either", "Either"],
              ].map(([k, label]) => (
                <label key={k} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="sharePreference"
                    value={k}
                    checked={sharePreference === k}
                    onChange={() => setSharePreference(k)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => nav(schoolPath("/courses"))}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
            style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}




















