// src/components/CommentSection.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import AsyncButton from "./AsyncButton";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import {
  fetchComments,
  postComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from "../api/comments";

dayjs.extend(relativeTime);
dayjs.locale("en");

export default function CommentSection({ postId, postAuthorEmail }) {
  const { user } = useAuth();
  const { schoolTheme } = useSchool();

  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const assignAnonymousIds = useCallback(
    (list) => {
      const map = {};
      let count = 1;
      if (postAuthorEmail) map[postAuthorEmail] = `anonymous${count++}`;
      return list.map((c) => {
        if (!map[c.email]) map[c.email] = `anonymous${count++}`;
        return { ...c, anonymousId: map[c.email] };
      });
    },
    [postAuthorEmail]
  );

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchComments(postId, "freeboard");
      setComments(assignAnonymousIds(data));
    } catch (err) {
      console.error("fetchComments failed:", err);
      alert("Failed to load comments.");
    }
  }, [postId, assignAnonymousIds]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await postComment({ postId, email: user.email, content });
      setContent("");
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to post comment.");
    }
  };

  const handleReplySubmit = async (parentId) => {
    if (!replyContent.trim()) return;
    try {
      await postComment({ postId, email: user.email, content: replyContent, parentId });
      setReplyContent("");
      setReplyTo(null);
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to post reply.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment({ commentId: id, email: user.email });
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to delete comment.");
    }
  };

  const handleEdit = async (id) => {
    if (!editContent.trim()) {
      setEditId(null);
      return;
    }
    try {
      await updateComment({ commentId: id, email: user.email, content: editContent });
      setEditId(null);
      setEditContent("");
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to update comment.");
    }
  };

  const handleThumbsUp = async (commentId) => {
    try {
      await toggleCommentLike({ commentId, email: user.email });
      loadComments();
    } catch (err) {
      alert(err.message || "Failed to like comment.");
    }
  };

  // ✅ Enter → 제출, Shift+Enter → 줄바꿈, Esc → 취소
  const handleKeyDown = (e, type, parentId = null) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (type === "comment") handleSubmit();
      if (type === "reply") handleReplySubmit(parentId);
    } else if (e.key === "Escape") {
      if (type === "comment") setContent("");
      if (type === "reply") {
        setReplyContent("");
        setReplyTo(null);
      }
    }
  };

  const renderComments = (parentId = null) => {
    const nested = comments
      .filter((c) => (c.parentId || null) === parentId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (!nested.length) return null;

    const isChild = parentId !== null;

    return (
      <ul
        className={
          isChild
            ? "ml-5 border-l-2 border-gray-200 pl-4 space-y-3"
            : "space-y-4"
        }
      >
        {nested.map((c) => {
          const isOwner = user?.email === c.email;

          return (
            <li
              key={c._id}
              className={
                isChild
                  ? "rounded-xl bg-gray-50 p-3"
                  : "border-b border-gray-100 pb-4"
              }
            >
              {/* meta */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-800">{c.anonymousId}</span>
                <span>•</span>
                <span>{c.createdAt ? dayjs(c.createdAt).fromNow() : ""}</span>
              </div>

              {/* content / edit */}
              {editId === c._id ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, "comment")}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    placeholder="Edit your comment"
                    autoFocus
                  />
                  <AsyncButton
                    onClick={() => handleEdit(c._id)}
                    loadingText="Saving…"
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-white shadow"
                    style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                  >
                    Save
                  </AsyncButton>
                  <button
                    onClick={() => {
                      setEditId(null);
                      setEditContent("");
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {c.content}
                </p>
              )}

              {/* actions */}
              {editId !== c._id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => handleThumbsUp(c._id)}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    👍 {c.thumbsUp || 0}
                  </button>
                  <button
                    onClick={() => setReplyTo(c._id)}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    ↩️ Reply
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          setEditId(c._id);
                          setEditContent(c.content);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        ✏️ Edit
                      </button>
                      <AsyncButton
                        onClick={() => handleDelete(c._id)}
                        loadingText="Deleting…"
                        className="rounded-lg bg-red-500 px-2.5 py-1 font-medium text-white shadow hover:bg-red-600"
                      >
                        🗑️ Delete
                      </AsyncButton>
                    </>
                  )}
                </div>
              )}

              {/* reply box */}
              {replyTo === c._id && (
                <div className="mt-3 flex items-center gap-2">
                  <textarea
                    rows={2}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, "reply", c._id)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    placeholder="Write a reply… (Enter = submit, Shift+Enter = newline, Esc = cancel)"
                  />
                </div>
              )}

              {renderComments(c._id)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-bold text-gray-900">💬 Comments</h3>
      <form onSubmit={(e) => e.preventDefault()} className="mb-4 flex gap-2">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "comment")}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          placeholder="Write a comment… (Enter = submit, Shift+Enter = newline, Esc = clear)"
        />
        <AsyncButton
          onClick={handleSubmit}
          loadingText="Posting…"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
          style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
        >
          Post
        </AsyncButton>
      </form>

      {renderComments()}
    </div>
  );
}








