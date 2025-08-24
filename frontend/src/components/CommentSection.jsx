// frontend/src/components/CommentSection.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import AsyncButton from "./AsyncButton";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import {
  listComments,
  addComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
  toggleCommentThumbs,
} from "../api/comments";

dayjs.extend(relativeTime);
dayjs.locale("en");

/**
 * Props:
 * - postId (required)
 */
export default function CommentSection({ postId }) {
  const { user, token } = useAuth();
  const { school } = useSchool();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const me = (user?.email || "").toLowerCase();

  const load = useCallback(async () => {
    if (!postId || !school || !token) return;
    setLoading(true);
    setErr("");
    try {
      const data = await listComments({ school, token, postId });
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("comments:load failed", e);
      setErr("Failed to load comments.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId, school, token]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async () => {
    const content = input.trim();
    if (!content || !postId) return;
    try {
      const doc = await addComment({ school, token, postId, content });
      setComments((prev) => [...prev, doc]);
      setInput("");
    } catch (e) {
      console.error("comments:add failed", e);
      alert("Failed to add comment.");
    }
  };

  const onStartEdit = (c) => {
    setEditingId(c._id);
    setEditText(c.content || "");
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const onSaveEdit = async () => {
    const content = editText.trim();
    if (!content || !editingId) return;
    try {
      const updated = await apiUpdateComment({ school, token, commentId: editingId, content });
      setComments((prev) => prev.map((c) => (c._id === editingId ? updated : c)));
      onCancelEdit();
    } catch (e) {
      console.error("comments:update failed", e);
      alert("Failed to update comment.");
    }
  };

  const onDelete = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await apiDeleteComment({ school, token, commentId });
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (e) {
      console.error("comments:delete failed", e);
      alert("Failed to delete comment.");
    }
  };

  const onToggleLike = async (commentId) => {
    try {
      const res = await toggleCommentThumbs({ school, token, commentId });
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, thumbs: res.thumbs ?? [], thumbsCount: res.count ?? (res.thumbs?.length || 0) } : c
        )
      );
    } catch (e) {
      console.error("comments:thumb toggle failed", e);
    }
  };

  if (!user || !token) {
    return (
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Please log in to view and write comments.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">Comments</h3>

      {/* New comment input */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Write a comment…"
          className="h-20 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        />
        <div className="mt-2 text-right">
          <AsyncButton onClick={onSubmit} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black">
            Post
          </AsyncButton>
        </div>
      </div>

      {/* Comments list */}
      <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
        {loading ? (
          <div className="p-3 text-sm text-gray-600">Loading…</div>
        ) : err ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>
        ) : comments.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">No comments yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {comments.map((c) => {
              const mine = (c.email || "").toLowerCase() === me;
              const liked = (c.thumbs || []).map((e) => e.toLowerCase()).includes(me);
              const likeCount = c.thumbsCount ?? (c.thumbs ? c.thumbs.length : 0);

              return (
                <li key={c._id} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {(c.email || "").split("@")[0] || "anon"}
                        </span>
                        <span className="text-xs text-gray-500">• {dayjs(c.createdAt).fromNow()}</span>
                      </div>

                      {editingId === c._id ? (
                        <div className="mt-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={onSaveEdit}
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
                            >
                              Save
                            </button>
                            <button
                              onClick={onCancelEdit}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{c.content}</p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                        <button
                          onClick={() => onToggleLike(c._id)}
                          className={`rounded px-2 py-1 ${liked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"}`}
                          title="Like"
                        >
                          👍 {likeCount}
                        </button>

                        {mine && editingId !== c._id && (
                          <>
                            <button onClick={() => onStartEdit(c)} className="rounded px-2 py-1 hover:bg-gray-100">
                              Edit
                            </button>
                            <button
                              onClick={() => onDelete(c._id)}
                              className="rounded px-2 py-1 text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}









