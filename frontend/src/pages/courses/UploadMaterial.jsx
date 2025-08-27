// src/pages/courses/UploadMaterial.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSchoolPath } from "../../utils/schoolPath";

export default function UploadMaterial() {
  const { courseId } = useParams();
  const { school } = useSchool();
  const { token } = useAuth();
  const navigate = useNavigate();
  const schoolPath = useSchoolPath();

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("note");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    // TODO: POST /api/:school/materials  (requireAuth)
    alert("Upload endpoint will be wired next. This page is gated already.");
    if (courseId) navigate(schoolPath(`/courses/${encodeURIComponent(courseId)}/materials`));
    else navigate(schoolPath("/courses"));
  };

  return (
    <div className="p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Upload Material</h1>
        <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <form onSubmit={onSubmit} className="max-w-xl space-y-4">
        {courseId && (
          <div className="text-sm text-gray-600">
            Course: <b>{decodeURIComponent(courseId)}</b>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g., Midterm review notes"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {["note", "syllabus", "exam", "slide", "link", "other"].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-medium">File (optional)</div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Allowed: pdf, doc(x), ppt(x), xls(x), txt, md, png, jpg, webp. Max 25MB (server enforced).
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">or Link (URL)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          disabled={!token}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Upload
        </button>
      </form>
    </div>
  );
}
