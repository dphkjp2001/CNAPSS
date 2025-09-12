// frontend/src/pages/careerboard/CareerBoardWrite.jsx
import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import AsyncButton from "../../components/AsyncButton";
import { createCareerPost } from "../../api/careerPosts";
import { useLoginGate } from "../../hooks/useLoginGate";

export default function CareerBoardWrite() {
  const { ensureAuth } = useLoginGate();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const isValid = useMemo(() => Boolean(title.trim() && content.trim()), [title, content]);

  const submit = useCallback(() => {
    ensureAuth(async () => {
      if (!isValid) return;
      try {
        setError("");
        await createCareerPost({
          title: title.trim(),
          content: content.trim(),
          school,
        });
        alert("Post submitted!");
        navigate(schoolPath("/career"));
      } catch (err) {
        console.error("Career post creation error:", err);
        const msg = err?.message || "Unexpected error occurred.";
        setError(msg);
        alert(msg);
      }
    });
  }, [isValid, title, content, school, navigate, schoolPath, ensureAuth]);

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">New Career Post</h1>
            <p className="mt-1 text-sm text-gray-500">
              Discuss internships, careers, or academic planning with your campus community.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-5 p-5 sm:p-6">
            <div>
              <label className="block text-sm font-medium text-gray-900">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a title"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                required
                aria-label="post title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your content here..."
                rows={10}
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                required
                aria-label="post content"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tip: Keep it concise and respectful. No personal information.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => navigate(schoolPath("/career"))}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <AsyncButton
                onClick={submit}
                loadingText="Posting..."
                className="rounded-xl px-4 py-2 text-sm text-white"
                style={{ backgroundColor: schoolTheme?.primary || "#111827" }}
              >
                Post
              </AsyncButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

