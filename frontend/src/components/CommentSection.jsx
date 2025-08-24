// frontend/src/components/CommentSection.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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

export default function CommentSection({ postId }) {
  const { user, token } = useAuth();
  const { school } = useSchool();

  const me = (user?.email || "").toLowerCase();

  const [comments, setComments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [err, setErr] = useState("");

  // root input
  const [rootText, setRootText] = useState("");
  const [postingRoot, setPostingRoot] = useState(false);
  const [composingRoot, setComposingRoot] = useState(false);

  // per-item ui states
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [postingReplyId, setPostingReplyId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [likingId, setLikingId] = useState(null);

  // fetch list once
  const load = useCallback(async () => {
    if (!postId || !school || !token) return;
    setListLoading(true);
    setErr("");
    try {
      const data = await listComments({ school, token, postId });
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("comments:load failed", e);
      setErr("Failed to load comments.");
      setComments([]);
    } finally {
      setListLoading(false);
    }
  }, [postId, school, token]);

  useEffect(() => {
    load();
  }, [load]);

  // build tree
  const tree = useMemo(() => {
    const map = new Map();
    const nodes = (comments || []).map((c) => ({ ...c, children: [] }));
    nodes.forEach((n) => map.set(n._id, n));
    const roots = [];
    nodes.forEach((n) => {
      if (n.parentId && map.has(n.parentId)) map.get(n.parentId).children.push(n);
      else roots.push(n);
    });
    // optional: sort by time inside each level
    const sortByTime = (arr) => arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const walk = (arr) => { sortByTime(arr); arr.forEach((n) => walk(n.children)); };
    walk(roots);
    return roots;
  }, [comments]);

  // helpers to update local state
  const replaceById = (id, next) =>
    setComments((prev) => prev.map((c) => (c._id === id ? next : c)));
  const removeByIdWithChildren = (id) =>
    setComments((prev) => {
      // remove target and its descendants
      const ids = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach((c) => {
          if (c.parentId && ids.has(c.parentId) && !ids.has(c._id)) {
            ids.add(c._id);
            changed = true;
          }
        });
      }
      return prev.filter((c) => !ids.has(c._id));
    });

  /* ====================== actions ====================== */

  // add root comment
  const submitRoot = async () => {
    const content = rootText.trim();
    if (!content) return;
    setPostingRoot(true);
    try {
      const doc = await addComment({ school, token, postId, content });
      setComments((prev) => [...prev, doc]);
      setRootText("");
    } catch (e) {
      console.error("comments:add root failed", e);
      alert("Failed to add comment.");
    } finally {
      setPostingRoot(false);
    }
  };

  // start reply
  const startReply = (commentId) => {
    setReplyingId(commentId);
    setReplyText("");
  };
  const cancelReply = () => {
    setReplyingId(null);
    setReplyText("");
  };
  const submitReply = async (parentId) => {
    const content = replyText.trim();
    if (!content) return;
    setPostingReplyId(parentId);
    try {
      const doc = await addComment({ school, token, postId, content, parentId });
      setComments((prev) => [...prev, doc]);
      cancelReply();
    } catch (e) {
      console.error("comments:add reply failed", e);
      alert("Failed to add reply.");
    } finally {
      setPostingReplyId(null);
    }
  };

  // edit
  const startEdit = (c) => {
    setEditingId(c._id);
    setEditText(c.content || "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };
  const saveEdit = async () => {
    const content = editText.trim();
    if (!content || !editingId) return;
    setSavingId(editingId);
    try {
      const updated = await apiUpdateComment({ school, token, commentId: editingId, content });
      replaceById(editingId, updated);
      cancelEdit();
    } catch (e) {
      console.error("comments:update failed", e);
      alert("Failed to update comment.");
    } finally {
      setSavingId(null);
    }
  };

  // delete
  const deleteOne = async (id) => {
    if (!window.confirm("Delete this comment? Replies will also be removed in the list view.")) return;
    setDeletingId(id);
    try {
      await apiDeleteComment({ school, token, commentId: id });
      removeByIdWithChildren(id);
    } catch (e) {
      console.error("comments:delete failed", e);
      alert("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  // like
  const toggleLike = async (id) => {
    setLikingId(id);
    try {
      const res = await toggleCommentThumbs({ school, token, commentId: id });
      replaceById(id, (prev => {
        const p = comments.find((c) => c._id === id);
        if (!p) return p;
        return { ...p, thumbs: res.thumbs ?? [], thumbsCount: res.count ?? (res.thumbs?.length || 0) };
      })());
    } catch (e) {
      console.error("comments:thumb toggle failed", e);
    } finally {
      setLikingId(null);
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

      {/* root composer */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <textarea
          value={rootText}
          onChange={(e) => setRootText(e.target.value)}
          onCompositionStart={() => setComposingRoot(true)}
          onCompositionEnd={() => setComposingRoot(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !composingRoot) {
              e.preventDefault();
              submitRoot();
            }
          }}
          placeholder="Write a comment…"
          className="h-20 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        />
        <div className="mt-2 text-right">
          <AsyncButton
            disabled={postingRoot}
            onClick={submitRoot}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {postingRoot ? "Posting…" : "Post"}
          </AsyncButton>
        </div>
      </div>

      {/* list */}
      <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
        {listLoading ? (
          <div className="p-3 text-sm text-gray-600">Loading…</div>
        ) : err ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>
        ) : tree.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">No comments yet.</div>
        ) : (
          <ul className="space-y-3">
            {tree.map((n) => (
              <CommentNode
                key={n._id}
                node={n}
                me={me}
                replyingId={replyingId}
                replyText={replyText}
                postingReplyId={postingReplyId}
                editingId={editingId}
                editText={editText}
                savingId={savingId}
                deletingId={deletingId}
                likingId={likingId}
                onStartReply={startReply}
                onCancelReply={cancelReply}
                onChangeReply={setReplyText}
                onSubmitReply={submitReply}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onChangeEdit={setEditText}
                onSaveEdit={saveEdit}
                onDelete={deleteOne}
                onToggleLike={toggleLike}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommentNode(props) {
  const {
    node,
    me,
    replyingId,
    replyText,
    postingReplyId,
    editingId,
    editText,
    savingId,
    deletingId,
    likingId,
    onStartReply,
    onCancelReply,
    onChangeReply,
    onSubmitReply,
    onStartEdit,
    onCancelEdit,
    onChangeEdit,
    onSaveEdit,
    onDelete,
    onToggleLike,
  } = props;

  const mine = (node.email || "").toLowerCase() === me;
  const liked = (node.thumbs || []).map((e) => e.toLowerCase()).includes(me);
  const likeCount = node.thumbsCount ?? (node.thumbs ? node.thumbs.length : 0);

  return (
    <li>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {(node.email || "").split("@")[0] || "anon"}
            </span>
            <span className="text-xs text-gray-500">• {dayjs(node.createdAt).fromNow()}</span>
          </div>

          {editingId === node._id ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => onChangeEdit(e.target.value)}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onSaveEdit}
                  disabled={savingId === node._id}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {savingId === node._id ? "Saving…" : "Save"}
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
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{node.content}</p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
            <button
              onClick={() => onToggleLike(node._id)}
              disabled={likingId === node._id}
              className={`rounded px-2 py-1 ${liked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"} disabled:opacity-60`}
            >
              👍 {likeCount}
            </button>

            <button onClick={() => onStartReply(node._id)} className="rounded px-2 py-1 hover:bg-gray-100">
              Reply
            </button>

            {mine && (
              <>
                <button onClick={() => onStartEdit(node)} className="rounded px-2 py-1 hover:bg-gray-100">
                  Edit
                </button>
                <button
                  onClick={() => onDelete(node._id)}
                  disabled={deletingId === node._id}
                  className="rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === node._id ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>

          {/* reply box */}
          {replyingId === node._id && (
            <div className="mt-2">
              <textarea
                value={replyText}
                onChange={(e) => onChangeReply(e.target.value)}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                placeholder="Write a reply…"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onSubmitReply(node._id)}
                  disabled={postingReplyId === node._id}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {postingReplyId === node._id ? "Posting…" : "Reply"}
                </button>
                <button onClick={onCancelReply} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* children */}
          {node.children?.length > 0 && (
            <ul className="mt-3 space-y-3 border-l-2 border-gray-200 pl-6">
              {node.children.map((child) => (
                <CommentNode
                  key={child._id}
                  node={child}
                  me={me}
                  replyingId={replyingId}
                  replyText={replyText}
                  postingReplyId={postingReplyId}
                  editingId={editingId}
                  editText={editText}
                  savingId={savingId}
                  deletingId={deletingId}
                  likingId={likingId}
                  onStartReply={onStartReply}
                  onCancelReply={onCancelReply}
                  onChangeReply={onChangeReply}
                  onSubmitReply={onSubmitReply}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onChangeEdit={onChangeEdit}
                  onSaveEdit={onSaveEdit}
                  onDelete={onDelete}
                  onToggleLike={onToggleLike}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}











