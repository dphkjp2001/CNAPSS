/// frontend/src/pages/freeboard/FreeBoardWrite.jsx
import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import AsyncButton from "../../components/AsyncButton";
import { createPost } from "../../api/posts";
import { useLoginGate } from "../../hooks/useLoginGate";

export default function FreeBoardWrite() {
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const { ensureAuth } = useLoginGate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const isValid = useMemo(
    () => Boolean(title.trim() && content.trim()),
    [title, content]
  );

  const doCreate = useCallback(async () => {
    try {
      setError("");
      await createPost({
        title: title.trim(),
        content: content.trim(),
        email: user?.email,
        nickname: user?.nickname,
        school,
      });
      alert("Post submitted!");
      navigate(schoolPath("/freeboard"));
    } catch (err) {
      console.error("Post creation error:", err);
      const msg = err?.message || "Unexpected error occurred.";
      setError(msg);
      alert(msg);
    }
  }, [title, content, user?.email, user?.nickname, school, navigate, schoolPath]);

  const submit = useCallback(async () => {
    if (!isValid) return;
    if (!user) { ensureAuth(); return; } // 🔐 액션 시점에서만 로그인 요구
    await doCreate();
  }, [isValid, user, ensureAuth, doCreate]);

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
            <h1 className="text-2xl font-bold text-gray-900">New Post</h1>
            <p className="mt-1 text-sm text-gray-500">
              Share announcements, questions, or tips with your campus community.
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
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => navigate(schoolPath("/freeboard"))}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              >
                Cancel
              </button>

              <AsyncButton
                onClick={submit}
                loadingText="Posting…"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                disabled={!isValid}
              >
                Post
              </AsyncButton>
            </div>

            {!user && (
              <p className="pt-1 text-right text-xs text-gray-500">
                You can fill the form now — you’ll be asked to log in when you post.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}



