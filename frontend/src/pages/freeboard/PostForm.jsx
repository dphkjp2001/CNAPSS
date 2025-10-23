//frontend/src/pages/freeboard/PostForm.jsx

import React, { useState, useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPost } from "../../api/posts";
import { AuthContext } from "../../contexts/AuthContext";
import { useLoginGate } from "../../hooks/useLoginGate";

export default function PostForm() {
  const navigate = useNavigate();
  const { school } = useParams(); // /:school/freeboard/write
  const { user } = useContext(AuthContext);
  const { ensureAuth } = useLoginGate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDisabled = useMemo(
    () => submitting || title.trim() === "" || content.trim() === "",
    [submitting, title, content]
  );

  const onSubmit = async (e) => {
    e.preventDefault();

    // ✅ 보기/입력은 자유, "Post" 클릭 시에만 로그인 요구
    if (!user) {
      ensureAuth(); // 로그인/회원가입 게이트 오픈
      return;
    }

    try {
      setSubmitting(true);
      await createPost({
        school, // 멀티테넌시 스코프
        title: title.trim(),
        content: content.trim(),
      });
      navigate(`/${school}/freeboard`);
    } catch (err) {
      console.error(err);
      alert("Failed to create the post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = () => navigate(-1);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/70 backdrop-blur rounded-xl p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">New Post</h1>
        <p className="text-sm text-gray-500 mb-6">
          Share announcements, questions, or tips with your campus community.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write anything…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: Keep it concise and respectful. No personal information.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>

            {/* 유효성/중복 제출만 막고, 로그인은 클릭 시 처리 */}
            <button
              type="submit"
              disabled={isDisabled}
              className={`px-5 py-2 rounded-lg text-white ${
                isDisabled ? "bg-violet-300" : "bg-violet-500 hover:bg-violet-600"
              }`}
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {!user && (
            <p className="pt-1 text-right text-xs text-gray-500">
              You can fill the form now — you’ll be asked to log in when you post.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}






