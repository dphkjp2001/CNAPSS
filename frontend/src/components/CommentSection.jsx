import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import AsyncButton from "../components/AsyncButton"; // 경로는 프로젝트 구조에 맞게 유지
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { toggleCommentThumbs, addComment, listComments, updateComment as apiUpdateComment, deleteComment as apiDeleteComment } from "../api/comments";
import { normEmail, toId } from "../utils/gateBus"; // 프로젝트 유틸에 맞게 유지

export default function CommentSection({ postId, authorEmail, highlightId }) {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [err, setErr] = useState("");

  const [rootText, setRootText] = useState("");
  const [composingRoot, setComposingRoot] = useState(false);
  const [postingRoot, setPostingRoot] = useState(false);

  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [postingReplyId, setPostingReplyId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [likingId, setLikingId] = useState(null);

  const [flashId, setFlashId] = useState(highlightId || null);

  const school = user?.school || "";

  const me = useMemo(() => normEmail(user?.email), [user]);

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

  // 🔌 소켓 join/leave & 이벤트 핸들
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

  // 익명 라벨
  const anonLabelByEmail = useMemo(() => {
    const firstSeen = new Map();
    for (const c of comments) {
      const em = normEmail(c.email);
      if (!em) continue;
      const ts = new Date(c.createdAt || 0).getTime();
      if (!firstSeen.has(em)) firstSeen.set(em, ts);
      else firstSeen.set(em, Math.min(firstSeen.get(em), ts));
    }
    const author = normEmail(authorEmail);
    const others = Array.from(firstSeen.keys()).filter((e) => e && e !== author);
    others.sort((a, b) => (firstSeen.get(a) || 0) - (firstSeen.get(b) || 0));

    const map = new Map();
    if (author) map.set(author, "anonymous (게시자)");
    others.forEach((e, i) => map.set(e, `anonymous ${i + 1}`));
    return map;
  }, [comments, authorEmail]);

  const submitRoot = async () => {
    const content = rootText.trim();
    if (!content) return;
    setPostingRoot(true);
    try {
      await addComment({ school, token, postId, content, parentId: null });
      setRootText("");
    } catch (e) {
      console.error("comments:add root failed", e);
      alert("Failed to add comment.");
    } finally {
      setPostingRoot(false);
    }
  };

  const submitReply = async (parentId) => {
    const content = replyText.trim();
    if (!content) return;
    const pid = toId(parentId);
    setPostingReplyId(pid);
    try {
      await addComment({ school, token, postId, content, parentId: pid });
      setReplyingId(null);
      setReplyText("");
    } catch (e) {
      console.error("comments:add reply failed", e);
      alert("Failed to add reply.");
    } finally {
      setPostingReplyId(null);
    }
  };

  const saveEdit = async () => {
    const content = editText.trim();
    if (!content || !editingId) return;
    setSavingId(editingId);
    try {
      await apiUpdateComment({ school, token, commentId: editingId, content });
      setEditingId(null);
      setEditText("");
    } catch (e) {
      console.error("comments:update failed", e);
      alert("Failed to update comment.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteOne = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    const target = toId(id);
    setDeletingId(target);
    try {
      await apiDeleteComment({ school, token, commentId: target });
    } catch (e) {
      console.error("comments:delete failed", e);
      alert("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleLike = async (id, ownerEmail) => {
    const target = toId(id);
    // ✋ 내 댓글엔 좋아요 금지 (프론트에서 선제 차단)
    if (normEmail(ownerEmail) === me) return;

    setLikingId(target);
    try {
      await toggleCommentThumbs({ school, token, commentId: target });
      // socket "comment:thumbs" 반영
    } catch (e) {
      console.error("comments:thumb toggle failed", e);
    } finally {
      setLikingId(null);
    }
  };

  if (!user || !token) {
    return <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-gray-600">Please log in to view and write comments.</div>;
  }

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">Comments</h3>

      {/* root composer */}
      <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm">
        <textarea
          value={rootText}
          onChange={(e) => setRootText(e.target.value)}
          onCompositionStart={() => setComposingRoot(true)}
          onCompositionEnd={() => setComposingRoot(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !composingRoot) { e.preventDefault(); submitRoot(); } }}
          placeholder="Write a comment…"
          className="h-20 w-full resize-none rounded-lg border px-3 py-2 text-sm"
        />
        <div className="mt-2 text-right">
          <AsyncButton disabled={postingRoot} onClick={submitRoot} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60">
            {postingRoot ? "Posting…" : "Post"}
          </AsyncButton>
        </div>
      </div>

      {/* list */}
      <div className="rounded-xl border bg-white p-2 sm:p-3">
        {listLoading ? (
          <div className="p-3 text-sm text-gray-600">Loading…</div>
        ) : err ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>
        ) : comments.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">No comments yet.</div>
        ) : (
          <ul className="space-y-3">
            {/** 트리 정렬은 서버에서 시간순, 여기선 플랫 렌더 */}
            {comments.map((c) => (
              <CommentNode
                key={toId(c._id)}
                node={c}
                me={me}
                authorLabelMap={anonLabelByEmail}
                onToggleLike={toggleLike}
                likingId={likingId}
                deletingId={deletingId}
                savingId={savingId}
                onStartEdit={(x) => { setEditingId(toId(x._id)); setEditText(x.content || ""); }}
                onCancelEdit={() => { setEditingId(null); setEditText(""); }}
                onChangeEdit={setEditText}
                onSaveEdit={saveEdit}
                onDelete={deleteOne}
                editingId={editingId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommentNode({
  node,
  me,
  authorLabelMap,
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
}) {
  const isMine = String(node.email || "").toLowerCase() === String(me || "");
  const thumbsArr = node.thumbs ?? node.thumbsUpUsers ?? [];
  const liked = thumbsArr.map((e) => String(e || "").toLowerCase()).includes(me);
  const likeCount = node.thumbsCount ?? thumbsArr.length;

  return (
    <li>
      <div id={`comment-${node._id}`} className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{authorLabelMap.get(String(node.email || "").toLowerCase()) || "anonymous"}</span>
            <span className="text-xs text-gray-500">• {dayjs(node.createdAt).fromNow()}</span>
          </div>

          {editingId === node._id ? (
            <div className="mt-2">
              <textarea
                value={node.editText}
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
              onClick={() => onToggleLike(node._id, node.email)}
              disabled={likingId === node._id || isMine} // ← 자기 댓글이면 비활성화
              className={`rounded px-2 py-1 ${liked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"} disabled:opacity-60`}
              title={isMine ? "You can’t like your own comment." : "Like comment"}
            >
              👍 {likeCount}
            </button>

            {/* 편집/삭제는 작성자만 */}
            {isMine && (
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
        </div>
      </div>
    </li>
  );
}
















