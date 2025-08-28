// frontend/src/components/CommentSection.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { useSocket } from "../contexts/SocketContext"; // ✅ 소켓
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

const toId = (v) => (v == null ? "" : String(v));
const normEmail = (e) => String(e || "").toLowerCase().trim();

/**
 * Props:
 * - postId (required)
 * - authorEmail (optional)
 * - highlightId (optional)
 */
export default function CommentSection({ postId, authorEmail = "", highlightId = null }) {
  const { user, token } = useAuth();
  const { school } = useSchool();
  const socket = useSocket(); // {socket, on, off, emit}

  const me = normEmail(user?.email);
  const author = normEmail(authorEmail);

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

  // 🎯 highlight (scroll + flash)
  const [flashId, setFlashId] = useState(null);

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

  useEffect(() => { load(); }, [load]);

  /* ====== 🔌 실시간 구독: post 룸 join/leave & 이벤트 핸들 ====== */
  useEffect(() => {
    if (!socket?.emit || !socket?.on || !postId) return;

    // join
    socket.emit("post:join", { postId });

    const onNew = (c) => {
      if (!c || String(c.postId) !== String(postId)) return;
      setComments((prev) => (prev.some((x) => toId(x._id) === toId(c._id)) ? prev : [...prev, c]));
    };

    const onUpdate = (c) => {
      if (!c || String(c.postId) !== String(postId)) return;
      setComments((prev) => prev.map((x) => (toId(x._id) === toId(c._id) ? c : x)));
    };

    const onDelete = ({ _id }) => {
      if (!_id) return;
      setComments((prev) => prev.filter((x) => toId(x._id) !== toId(_id)));
    };

    const onThumbs = ({ _id, thumbs }) => {
      if (!_id) return;
      setComments((prev) =>
        prev.map((x) =>
          toId(x._id) === toId(_id)
            ? { ...x, thumbsUpUsers: thumbs || [], thumbsCount: (thumbs || []).length }
            : x
        )
      );
    };

    socket.on("comment:new", onNew);
    socket.on("comment:update", onUpdate);
    socket.on("comment:delete", onDelete);
    socket.on("comment:thumbs", onThumbs);

    return () => {
      try { socket.emit("post:leave", { postId }); } catch (_) {}
      socket.off("comment:new", onNew);
      socket.off("comment:update", onUpdate);
      socket.off("comment:delete", onDelete);
      socket.off("comment:thumbs", onThumbs);
    };
  }, [socket, postId]);

  /* ---------- stable anonymous labels per post ---------- */
  const anonLabelByEmail = useMemo(() => {
    const firstSeen = new Map();
    for (const c of comments) {
      const em = normEmail(c.email);
      if (!em) continue;
      const ts = new Date(c.createdAt || 0).getTime();
      if (!firstSeen.has(em)) firstSeen.set(em, ts);
      else firstSeen.set(em, Math.min(firstSeen.get(em), ts));
    }
    const others = Array.from(firstSeen.keys()).filter((e) => e && e !== author);
    others.sort((a, b) => (firstSeen.get(a) || 0) - (firstSeen.get(b) || 0));

    const map = new Map();
    if (author) map.set(author, "anonymous (게시자)");
    others.forEach((e, i) => map.set(e, `anonymous ${i + 1}`));
    return map;
  }, [comments, author]);

  const labelOf = useCallback(
    (email) => anonLabelByEmail.get(normEmail(email)) || "anonymous",
    [anonLabelByEmail]
  );

  /* ---------- tree build ---------- */
  const tree = useMemo(() => {
    const nodes = (comments || []).map((c) => ({
      ...c,
      _id: toId(c._id),
      parentId: c.parentId ? toId(c.parentId) : null,
      children: [],
    }));

    const map = new Map();
    nodes.forEach((n) => map.set(n._id, n));

    const roots = [];
    nodes.forEach((n) => {
      const pid = n.parentId ? toId(n.parentId) : "";
      if (pid && map.has(pid)) map.get(pid).children.push(n);
      else roots.push(n);
    });

    const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const walk = (arr) => { arr.sort(byTime); arr.forEach((n) => walk(n.children)); };
    walk(roots);

    return roots;
  }, [comments]);

  /* ---------- highlight after list ready ---------- */
  useEffect(() => {
    if (!highlightId || listLoading) return;
    const id = String(highlightId);
    const run = () => {
      const el = document.getElementById(`comment-${id}`);
      if (el) {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          el.scrollIntoView();
        }
        setFlashId(id);
        const t = setTimeout(() => setFlashId(null), 1800);
        return () => clearTimeout(t);
      }
    };
    const r = requestAnimationFrame(run);
    return () => cancelAnimationFrame(r);
  }, [highlightId, listLoading, comments]);

  /* ---------- helpers ---------- */
  const replaceById = (id, next) =>
    setComments((prev) => prev.map((c) => (toId(c._id) === toId(id) ? next : c)));

  const removeByIdWithChildren = (id) =>
    setComments((prev) => {
      const target = toId(id);
      const set = new Set([target]);
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach((c) => {
          const pid = c.parentId ? toId(c.parentId) : "";
          if (pid && set.has(pid) && !set.has(toId(c._id))) {
            set.add(toId(c._id));
            changed = true;
          }
        });
      }
      return prev.filter((c) => !set.has(toId(c._id)));
    });

  /* ---------- actions ---------- */
  const submitRoot = async () => {
    const content = rootText.trim();
    if (!content) return;
    setPostingRoot(true);
    try {
      const doc = await addComment({ school, token, postId, content });
      setComments((prev) => [...prev, doc]); // 서버 소켓도 오지만 중복 방지 로직이 있으니 OK
      setRootText("");
    } catch (e) {
      console.error("comments:add root failed", e);
      alert("Failed to add comment.");
    } finally {
      setPostingRoot(false);
    }
  };

  const startReply = (commentId) => {
    setReplyingId(toId(commentId));
    setReplyText("");
  };
  const cancelReply = () => {
    setReplyingId(null);
    setReplyText("");
  };
  const submitReply = async (parentId) => {
    const content = replyText.trim();
    if (!content) return;
    const pid = toId(parentId);
    setPostingReplyId(pid);
    try {
      const doc = await addComment({ school, token, postId, content, parentId: pid });
      setComments((prev) => [...prev, doc]);
      cancelReply();
    } catch (e) {
      console.error("comments:add reply failed", e);
      alert("Failed to add reply.");
    } finally {
      setPostingReplyId(null);
    }
  };

  const startEdit = (c) => {
    setEditingId(toId(c._id));
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
      replaceById(editingId, {
        ...updated,
        _id: toId(updated._id),
        parentId: updated.parentId ? toId(updated.parentId) : null,
      });
      cancelEdit();
    } catch (e) {
      console.error("comments:update failed", e);
      alert("Failed to update comment.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteOne = async (id) => {
    if (!window.confirm("Delete this comment? Replies will also be removed in the list view.")) return;
    const target = toId(id);
    setDeletingId(target);
    try {
      await apiDeleteComment({ school, token, commentId: target });
      removeByIdWithChildren(target);
    } catch (e) {
      console.error("comments:delete failed", e);
      alert("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleLike = async (id) => {
    const target = toId(id);
    setLikingId(target);
    try {
      const res = await toggleCommentThumbs({ school, token, commentId: target });
      setComments((prev) =>
        prev.map((c) =>
          toId(c._id) === target
            ? {
                ...c,
                thumbsUpUsers: res.thumbs ?? [],
                thumbsCount: res.count ?? (res.thumbs?.length || 0),
              }
            : c
        )
      );
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
                getLabel={labelOf}
                replyingId={replyingId}
                replyText={replyText}
                postingReplyId={postingReplyId}
                editingId={editingId}
                editText={editText}
                savingId={savingId}
                deletingId={deletingId}
                likingId={likingId}
                onStartReply={(id) => setReplyingId(toId(id))}
                onCancelReply={() => { setReplyingId(null); setReplyText(""); }}
                onChangeReply={setReplyText}
                onSubmitReply={submitReply}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onChangeEdit={setEditText}
                onSaveEdit={saveEdit}
                onDelete={deleteOne}
                onToggleLike={toggleLike}
                flashId={flashId}
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
    getLabel,
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
    flashId,
  } = props;

  const thumbsArr = node.thumbs ?? node.thumbsUpUsers ?? [];
  const liked = thumbsArr.map((e) => String(e || "").toLowerCase()).includes(me);
  const likeCount = node.thumbsCount ?? thumbsArr.length;

  const highlight = String(flashId || "") === String(node._id);
  const highlightCls = highlight ? "bg-yellow-50 ring-2 ring-yellow-300 rounded-lg p-2 transition-colors" : "";

  return (
    <li>
      <div id={`comment-${node._id}`} className={`flex items-start gap-3 ${highlightCls}`}>
        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{getLabel(node.email)}</span>
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

            {String(node.email || "").toLowerCase() === me && (
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

          {node.children?.length > 0 && (
            <ul className="mt-3 space-y-3 border-l-2 border-gray-200 pl-6">
              {node.children.map((child) => (
                <CommentNode
                  key={child._id}
                  node={child}
                  me={me}
                  getLabel={getLabel}
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
                  flashId={flashId}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* reply box */}
      {replyingId === node._id && (
        <div className="ml-11 mt-2">
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
    </li>
  );
}















