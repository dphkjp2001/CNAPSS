// frontend/src/components/PostForm.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPost } from "../api/posts"; // moved path
import { useAuth } from "../contexts/AuthContext";
import { useLoginGate } from "../hooks/useLoginGate";

/**
 * Freeboard post create form.
 * - Typing is allowed for unauthenticated users.
 * - We only open login gate when user actually submits.
 * - After success, redirect to /:school/freeboard/:id
 */
export default function PostForm() {
  const navigate = useNavigate();
  const { school } = useParams(); // /:school/...
  const { user } = useAuth();
  const { ensureAuth } = useLoginGate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]); // optional array of URLs (keep compatible with API)
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0 && !submitting,
    [title, content, submitting]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      // ask auth exactly at the submission moment
      ensureAuth();
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await createPost({
        school,
        title: title.trim(),
        content: content.trim(),
        images,
      });
      const newId = res?._id || res?.id;
      if (newId) {
        navigate(`/${encodeURIComponent(school)}/freeboard/${newId}`);
      } else {
        alert("Created but id is missing. Please refresh.");
      }
    } catch (err) {
      console.error("createPost failed:", err);
      alert("Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Write on Free Board</h2>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post…"
              className="mt-1 h-40 w-full resize-none rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* (Optional) simple image URLs input — keep compatible with API */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Image URLs (optional)
            </label>
            <input
              placeholder="Comma-separated URLs"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              onChange={(e) =>
                setImages(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
            <div className="mt-1 text-xs text-gray-500">
              We’ll upload file picker later; for now paste direct URLs if needed.
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {!user && (
            <p className="text-xs text-gray-500">
              You can fill the form now — you’ll be asked to log in when you post.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

