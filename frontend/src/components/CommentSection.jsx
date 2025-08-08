// src/components/CommentSection.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
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
} from "../api/comments"; // ✅ API 모듈 적용

dayjs.extend(relativeTime);
dayjs.locale("en");

function CommentSection({ postId, postAuthorEmail }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const assignAnonymousIds = useCallback((comments) => {
    const map = {};
    let count = 1;
    if (postAuthorEmail) map[postAuthorEmail] = `anonymous${count++}`;

    return comments.map((c) => {
      if (!map[c.email]) {
        map[c.email] = `anonymous${count++}`;
      }
      return { ...c, anonymousId: map[c.email] };
    });
  }, [postAuthorEmail]);

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchComments(postId, "freeboard");
      setComments(assignAnonymousIds(data));
    } catch (err) {
      console.error("댓글 불러오기 실패:", err);
      alert("댓글 로딩에 실패했습니다.");
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
      alert(err.message);
    }
  };

  const handleReplySubmit = async (parentId) => {
    if (!replyContent.trim()) return;
    try {
      await postComment({
        postId,
        email: user.email,
        content: replyContent,
        parentId,
      });
      setReplyContent("");
      setReplyTo(null);
      loadComments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제할까요?")) return;
    try {
      await deleteComment({ commentId: id, email: user.email });
      loadComments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = async (id) => {
    try {
      await updateComment({ commentId: id, email: user.email, content: editContent });
      setEditId(null);
      setEditContent("");
      loadComments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleThumbsUp = async (commentId) => {
    try {
      await toggleCommentLike({ commentId, email: user.email });
      loadComments();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderComments = (parentId = null, level = 0) => {
    const nested = comments
      .filter((c) => (c.parentId || null) === parentId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (nested.length === 0) return null;

    return (
      <ul className={parentId ? "ml-6 pl-4 border-l-2 border-gray-200" : "space-y-4"}>
        {nested.map((c) => (
          <li
            key={c._id}
            className={`text-sm ${
              parentId ? "bg-gray-50 rounded-md p-2" : "border-b border-gray-300 pb-3"
            }`}
          >
            <div className="flex items-center text-sm text-gray-700">
              <strong>{c.anonymousId}</strong>
              <span className="ml-2 text-gray-500">
                {c.createdAt ? dayjs(c.createdAt).fromNow() : ""}
              </span>
            </div>

            {editId === c._id ? (
              <div className="mt-1 flex items-center space-x-2">
                <input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="border rounded px-2 py-1 w-2/3"
                />
                <AsyncButton
                  onClick={() => handleEdit(c._id)}
                  loadingText="Saving..."
                  className="text-sm px-2 py-1 bg-green-500 text-white rounded"
                >
                  Save
                </AsyncButton>
                <button
                  onClick={() => setEditId(null)}
                  className="text-sm text-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1 text-gray-800">{c.content}</div>
            )}

            {editId !== c._id && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <button
                  onClick={() => handleThumbsUp(c._id)}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-yellow-100 text-gray-600"
                >
                  👍 {c.thumbsUp || 0}
                </button>

                {user?.email === c.email && (
                  <>
                    <button
                      onClick={() => {
                        setEditId(c._id);
                        setEditContent(c.content);
                      }}
                      className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    >
                      ✏️ Edit
                    </button>
                    <AsyncButton
                      onClick={() => handleDelete(c._id)}
                      loadingText="Deleting..."
                      className="px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      🗑️ Delete
                    </AsyncButton>
                  </>
                )}

                <button
                  onClick={() => setReplyTo(c._id)}
                  className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  ↩️ Reply
                </button>
              </div>
            )}

            {replyTo === c._id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="border rounded px-2 py-1 w-2/3"
                  placeholder="Write a reply..."
                  required
                />
                <AsyncButton
                  onClick={() => handleReplySubmit(c._id)}
                  loadingText="Replying..."
                  className="text-sm px-2 py-1 bg-blue-500 text-white rounded"
                >
                  Reply
                </AsyncButton>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-sm text-gray-500"
                >
                  Cancel
                </button>
              </div>
            )}

            {renderComments(c._id, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-4">💬 Comments</h3>
      <form onSubmit={(e) => e.preventDefault()} className="mb-4 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border rounded px-3 py-1 w-2/3"
          placeholder="Write a comment..."
          required
        />
        <AsyncButton
          onClick={handleSubmit}
          loadingText="Posting..."
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Post
        </AsyncButton>
      </form>

      <ul className="space-y-2">{renderComments()}</ul>
    </div>
  );
}

export default CommentSection;







