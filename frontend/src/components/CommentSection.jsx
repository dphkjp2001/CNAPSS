// frontend/src/components/CommentSection.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { useSocket } from "../contexts/SocketContext";
import AsyncButton from "./AsyncButton";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import { useLoginGate } from "../hooks/useLoginGate";

import {
  listComments,
  addComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
  toggleCommentThumbs, // correct name
} from "../api/comments";

dayjs.extend(relativeTime);
dayjs.locale("en");

const toId = (v) => (v == null ? "" : String(v));
const norm = (e) => String(e || "").toLowerCase().trim();

export default function CommentSection({ postId, authorEmail = "", highlightId = null }) {
  const { user, token } = useAuth();
  const { school } = useSchool();
  const socket = useSocket();
  const { ensureAuth } = useLoginGate();

  const me = norm(user?.email);
  const author = norm(authorEmail);

  const [comments, setComments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [err, setErr] = useState("");

  // root composer
  const [rootText, setRootText] = useState("");
  const [postingRoot, setPostingRoot] = useState(false);
  const [imeComposing, setImeComposing] = useState(false);

  // reply composer
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [postingReplyId, setPostingReplyId] = useState(null);

  // edit
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingId, setSavingId] = useState(null);

  // delete / like
  const [deletingId, setDeletingId] = useState(null);
  const [likingId, setLikingId] = useState(null);

  const [flashId, setFlashId] = useState(highlightId || null);

  // ---------- load list ----------
  const load = useCallback(async () => {
    if (!postId || !school) return;
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

  // ---------- socket sync ----------
  useEffect(() => {
    if (!socket?.emit || !socket?.on || !postId) return;

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

  // ---------- anonymous labels ----------
  const anonLabelByEmail = useMemo(() => {
    const firstSeen = new Map();
    for (const c of comments) {
      const em = norm(c.email);
      if (!em) continue;
      const ts = new Date(c.createdAt || 0).getTime();
      if (!firstSeen.has(em)) firstSeen.set(em, ts);
      else firstSeen.set(em, Math.min(firstSeen.get(em), ts));
    }
    const others = Array.from(firstSeen.keys()).filter((e) => e && e !== author);
    others.sort((a, b) => (firstSeen.get(a) || 0) - (firstSeen.get(b) || 0));

    const map = new Map();
    if (author) map.set(author, "anonymous (OP)");
    others.forEach((e, i) => map.set(e, `anonymous ${i + 1}`));
    return map;
  }, [comments, author]);

  const labelOf = useCallback(
    (email) => anonLabelByEmail.get(norm(email)) || "anonymous",
    [anonLabelByEmail]
  );

  // highlight fade
  useEffect(() => {
    if (!highlightId) return;
    setFlashId(highlightId);
    const t = setTimeout(() => setFlashId(null), 1500);
    return () => clearTimeout(t);
  }, [highlightId]);

  // build tree
  const { roots, childrenMap } = useMemo(() => {
    const list = (comments || []).map((c) => ({ ...c, _id: toId(c._id), parentId: toId(c.parentId) || null }));
    const byParent = new Map();
    const roots = [];
    for (const c of list) {
      if (!c.parentId) roots.push(c);
      const arr = byParent.get(c.parentId || "__root__") || [];
      arr.push(c);
      byParent.set(c.parentId || "__root__", arr);
    }
    return { roots, childrenMap: byParent };
  }, [comments]);

  // action-gate
  const ensureBeforeAction = () => {
    if (!user || !token) { ensureAuth(); return false; }
    return true;
  };

  // ---------- create (root) ----------
  const submitRoot = async () => {
    const content = rootText.trim();
    if (!content) return;
    if (!ensureBeforeAction()) return;

    setPostingRoot(true);
    try {
      const newCmt = await addComment({ school, token, postId, content });
      if (newCmt?._id) {
        setComments((prev) => (prev.some((x) => toId(x._id) === toId(newCmt._id)) ? prev : [...prev, newCmt]));
      }
      setRootText("");
    } catch (e) {
      console.error("comments:add root failed", e);
      alert("Failed to add comment.");
    } finally {
      setPostingRoot(false);
    }
  };

  // ---------- create (reply) ----------
  const submitReply = async (parentId) => {
    const content = replyText.trim();
    if (!content) return;
    if (!ensureBeforeAction()) return;

    const pid = toId(parentId);
    setPostingReplyId(pid);
    try {
      const newCmt = await addComment({ school, token, postId, content, parentId: pid });
      if (newCmt?._id) {
        setComments((prev) => (prev.some((x) => toId(x._id) === toId(newCmt._id)) ? prev : [...prev, newCmt]));
      }
      setReplyingId(null);
      setReplyText("");
    } catch (e) {
      console.error("comments:add reply failed", e);
      alert("Failed to add reply.");
    } finally {
      setPostingReplyId(null);
    }
  };

  // ---------- edit (optimistic) ----------
  const saveEdit = async () => {
    const content = editText.trim();
    if (!content || !editingId) return;
    if (!ensureBeforeAction()) return;

    const id = editingId;
    setSavingId(id);

    // optimistic apply
    const prev = comments;
    setComments((list) =>
      list.map((c) => (toId(c._id) === toId(id) ? { ...c, content, updatedAt: new Date().toISOString() } : c))
    );

    try {
      await apiUpdateComment({ school, token, commentId: id, content });
      setEditingId(null);
      setEditText("");
      // socket will also broadcast; our optimistic update keeps UI instant.
    } catch (e) {
      // revert on failure
      setComments(prev);
      console.error("comments:update failed", e);
      alert("Failed to update comment.");
    } finally {
      setSavingId(null);
    }
  };

  // ---------- delete (optimistic) ----------
  const deleteOne = async (id) => {
    if (!ensureBeforeAction()) return;
    if (!window.confirm("Delete this comment?")) return;

    const target = toId(id);
    setDeletingId(target);

    const prev = comments;
    // optimistic remove
    setComments((list) => list.filter((x) => toId(x._id) !== target && toId(x.parentId) !== target));

    try {
      await apiDeleteComment({ school, token, commentId: target });
      // socket will also broadcast; nothing else to do
    } catch (e) {
      // revert on failure
      setComments(prev);
      console.error("comments:delete failed", e);
      alert("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- like (optimistic) ----------
  const toggleLike = async (id, ownerEmail) => {
    if (!ensureBeforeAction()) return;
    if (norm(ownerEmail) === me) return; // no self-like

    const target = toId(id);
    setLikingId(target);

    const prev = comments;
    // optimistic toggle
    setComments((list) =>
      list.map((c) => {
        if (toId(c._id) !== target) return c;
        const arr = (c.thumbsUpUsers || []).map((e) => norm(e));
        const mine = norm(user?.email);
        const has = arr.includes(mine);
        const nextArr = has ? arr.filter((e) => e !== mine) : [...arr, mine];
        return { ...c, thumbsUpUsers: nextArr, thumbsCount: nextArr.length };
      })
    );

    try {
      await toggleCommentThumbs({ school, token, commentId: target });
      // socket will normalize counts for everyone else
    } catch (e) {
      // revert on failure
      setComments(prev);
      console.error("comments:thumb toggle failed", e);
    } finally {
      setLikingId(null);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">Comments</h3>

      {/* Root composer */}
      <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm">
        <textarea
          value={rootText}
          onChange={(e) => setRootText(e.target.value)}
          onCompositionStart={() => setImeComposing(true)}
          onCompositionEnd={() => setImeComposing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !imeComposing) {
              e.preventDefault();
              submitRoot();
            }
          }}
          placeholder="Write a comment…"
          className="h-20 w-full resize-none rounded-lg border px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          {!user && <span className="text-xs text-gray-500">You’ll be asked to log in when you post.</span>}
          <AsyncButton
            disabled={postingRoot}
            onClick={submitRoot}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            {postingRoot ? "Posting…" : "Post"}
          </AsyncButton>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border bg-white p-2 sm:p-3">
        {listLoading ? (
          <div className="p-3 text-sm text-gray-600">Loading…</div>
        ) : err ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>
        ) : comments.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">No comments yet.</div>
        ) : (
          <ul className="space-y-3">
            {roots.map((c) => (
              <ThreadNode
                key={toId(c._id)}
                node={c}
                depth={0}
                me={me}
                labelOf={labelOf}
                childrenMap={childrenMap}
                replyingId={replyingId}
                replyText={replyText}
                postingReplyId={postingReplyId}
                setReplyingId={setReplyingId}
                setReplyText={setReplyText}
                submitReply={submitReply}
                onToggleLike={toggleLike}
                likingId={likingId}
                deletingId={deletingId}
                savingId={savingId}
                onStartEdit={(x) => {
                  setEditingId(toId(x._id));
                  setEditText(x.content || "");
                }}
                onCancelEdit={() => { setEditingId(null); setEditText(""); }}
                onChangeEdit={setEditText}
                onSaveEdit={saveEdit}
                onDelete={deleteOne}
                editingId={editingId}
                flashId={flashId}
                isAuthed={!!user}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ThreadNode({
  node,
  depth,
  me,
  labelOf,
  childrenMap,
  replyingId,
  replyText,
  postingReplyId,
  setReplyingId,
  setReplyText,
  submitReply,
  onToggleLike,
  likingId,
  deletingId,
  savingId,
  onStartEdit,
  onCancelEdit,
  onChangeEdit,
  onSaveEdit,
  onDelete,
  editingId,
  flashId,
  isAuthed,
}) {
  const isMine = norm(node.email) === me;
  const thumbsArr = node.thumbs ?? node.thumbsUpUsers ?? [];
  const liked = thumbsArr.map((e) => norm(e)).includes(me);
  const likeCount = node.thumbsCount ?? thumbsArr.length;

  const children = (childrenMap.get(toId(node._id)) || []).filter((x) => toId(x._id) !== toId(node._id));

  return (
    <li>
      <div
        id={`comment-${node._id}`}
        className={`flex items-start gap-3 rounded-lg p-2 ${flashId === toId(node._id) ? "bg-yellow-50" : ""} ${depth ? "border-l border-gray-200 pl-4" : ""}`}
        style={{ marginLeft: depth ? depth * 30 : 0 }}
      >
        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{labelOf(node.email)}</span>
            <span className="text-xs text-gray-500">• {dayjs(node.createdAt).fromNow()}</span>
          </div>

          {editingId === toId(node._id) ? (
            <div className="mt-2">
              <textarea
                defaultValue={node.content}
                onChange={(e) => onChangeEdit(e.target.value)}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onSaveEdit}
                  disabled={savingId === node._id || !isAuthed}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                  title={!isAuthed ? "Log in to edit" : "Save"}
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
              onClick={() => onToggleLike(node._id, node.email)}
              disabled={likingId === node._id || isMine || !isAuthed}
              className={`rounded px-2 py-1 ${liked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"} disabled:opacity-60`}
              title={!isAuthed ? "Log in to like" : isMine ? "You can’t like your own comment." : "Like comment"}
            >
              👍 {likeCount}
            </button>

            <button
              onClick={() => {
                setReplyingId(toId(node._id));
                setReplyText("");
              }}
              className="rounded px-2 py-1 hover:bg-gray-100"
              title="Reply"
            >
              Reply
            </button>

            {isAuthed && isMine && (
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

          {replyingId === toId(node._id) && (
            <div className="mt-2 rounded-lg border bg-white p-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                className="h-16 w-full resize-none rounded-md border px-3 py-2 text-sm"
              />
              <div className="mt-2 flex items-center gap-2">
                <AsyncButton
                  onClick={() => submitReply(node._id)}
                  disabled={postingReplyId === node._id || !replyText.trim()}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {postingReplyId === node._id ? "Posting…" : "Reply"}
                </AsyncButton>
                <button
                  onClick={() => { setReplyingId(null); setReplyText(""); }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {children.length > 0 && (
        <ul className="mt-2 space-y-3">
          {children.map((child) => (
            <ThreadNode
              key={toId(child._id)}
              node={child}
              depth={Math.min(depth + 1, 6)}
              me={me}
              labelOf={labelOf}
              childrenMap={childrenMap}
              replyingId={replyingId}
              replyText={replyText}
              postingReplyId={postingReplyId}
              setReplyingId={setReplyingId}
              setReplyText={setReplyText}
              submitReply={submitReply}
              onToggleLike={onToggleLike}
              likingId={likingId}
              deletingId={deletingId}
              savingId={savingId}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onChangeEdit={onChangeEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              editingId={editingId}
              flashId={flashId}
              isAuthed={isAuthed}
            />
          ))}
        </ul>
      )}
    </li>
  );
}



















