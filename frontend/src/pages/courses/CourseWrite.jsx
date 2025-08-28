// src/pages/courses/CourseWrite.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import CourseCodePicker from "../../components/CourseCodePicker";
import { createMaterial } from "../../api/materials";
import uploadToCloudinary from "../../utils/uploadToCloudinary";

const termOfMonth = (m) => (m >= 8 ? "fall" : m >= 5 ? "summer" : "spring");
const currentSemester = () => {
  const now = new Date(); const y = now.getFullYear();
  return `${y}-${termOfMonth(now.getMonth() + 1)}`;
};

export default function CourseWrite() {
  const { token } = useAuth();
  const { school } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const params = useParams();
  const [sp] = useSearchParams();

  const [courseCode, setCourseCode] = useState(decodeURIComponent(params.courseId || ""));
  const [semester, setSemester] = useState(sp.get("sem") || currentSemester());
  const [kind, setKind] = useState("note"); // server enum: note | syllabus | exam | slide | link | other
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const kindOptions = useMemo(
    () => [
      { ui: "class notes", value: "note" },
      { ui: "syllabus", value: "syllabus" },
      { ui: "quiz", value: "exam" }, // map quiz → exam
      { ui: "exam", value: "exam" },
      { ui: "slide", value: "slide" },
      { ui: "link", value: "link" },
      { ui: "other", value: "other" },
    ],
    []
  );

  const semesterOptions = useMemo(() => {
    const now = new Date(), y = now.getFullYear();
    return Array.from(new Set([`${y-1}-fall`, `${y}-spring`, `${y}-summer`, `${y}-fall`, `${y+1}-spring`]));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!token) return;
    if (!courseCode?.trim()) return setErr("Please select a course code.");
    if (!semester) return setErr("Please select a semester.");
    if (!file && !link) return setErr("Attach a file or provide a link.");

    try {
      setBusy(true);

      let fileMeta = {};
      if (file) {
        const uploaded = await uploadToCloudinary(file, { folder: "materials" });
        fileMeta = {
          fileUrl: uploaded?.secure_url,
          filePublicId: uploaded?.public_id,
          fileMime: file?.type || "",
          fileSize: file?.size || 0,
        };
      }

      const payload = {
        courseCode: courseCode.toUpperCase(), // 제목 = courseCode (서버에서 강제 세팅)
        courseTitle: "",                       // optional, 있으면 전달
        semester,
        kind: kind,
        title: courseCode.toUpperCase(),       // 서버에서 다시 강제하지만 호환성 차원에서 넣음
        tags: [],
        url: link || "",
        ...fileMeta,
      };

      await createMaterial({ school, token, payload });

      // 완료 후 코스 자료 페이지로
      navigate(
        schoolPath(`/courses/${encodeURIComponent(courseCode.toUpperCase())}/materials?sem=${encodeURIComponent(semester)}`)
      );
    } catch (e) {
      setErr("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Share a course material</h1>
      <p className="mb-4 text-sm text-gray-600">
        Title will be set to the selected <b>course code</b>.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
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
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="sm:w-1/2">
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {kindOptions.map((k) => (
                <option key={k.value} value={k.value}>{k.ui}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">Attach a file (optional)</div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Allowed: pdf, doc(x), ppt(x), xls(x), txt, md, png, jpg, webp. Max 25MB.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">…or a link (URL)</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Share"}
          </button>
        </div>
      </form>
    </div>
  );
}
