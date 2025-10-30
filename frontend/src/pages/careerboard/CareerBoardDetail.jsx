// frontend/src/pages/careerboard/CareerBoardDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSchoolPath } from "../../utils/schoolPath";
import CommentSection from "../../components/CommentSection";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import {
  getCareerPost,
  getPublicCareerPost,
  deleteCareerPost,
  toggleCareerThumbs,
  updateCareerPost,
} from "../../api/careerPosts";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useLoginGate } from "../../hooks/useLoginGate";
import { apiFetch } from "../../api/http";
import { sendRequest, checkRequested } from "../../api/request";

dayjs.extend(relativeTime);
dayjs.locale("en");

// helpers (mirror of backend normalization)
const normType = (t, lf = false) => {
  const x = String(t || (lf ? "looking_for" : "")).toLowerCase();
  if (x === "looking_for" || x === "looking" || x === "lf" || x === "seeking") return "seeking";
  return "question";
};
const normKind = (k) => {
  const v = String(k || "").toLowerCase();
  if (v === "study_group") return "study_mate";
  return v;
};
const kindLabel = (k) =>
  k === "course_materials" ? "Course Materials" : k === "study_mate" ? "Study Mate" : k === "coffee_chat" ? "Coffee Chat" : "";

export default function CareerBoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { ensureAuth } = useLoginGate();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  // request UI
  const [reqOpen, setReqOpen] = useState(false);
  const [reqMsg, setReqMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [already, setAlready] = useState({ exists: false, conversationId: null });

  const loadPost = async () => {
    try {
      const data = token
        ? await getCareerPost({ school, id })
        : await getPublicCareerPost({ school, id });
      setPost(data);
      setEditTitle(data?.title || "");
      setEditContent(data?.content || "");
    } catch (err) {
      setError(err.message || "Failed to load the post.");
    }
  };

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, school, token]);

  // 알림 읽음 처리
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const nid = sp.get("nid");
    async function markRead() {
      if (!nid || !user?.email || !school) return;
      try {
        const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
        await apiFetch(`${base}/${school}/notification/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { commentId: nid, email: user.email },
        });
      } catch {}
    }
    markRead();
  }, [location.search, user?.email, school]);

  const isAuthor = useMemo(
    () => (user?.email || "").toLowerCase() === (post?.email || "").toLowerCase(),
    [user, post]
  );

  const postType = useMemo(
    () => normType(post?.postType || post?.type, post?.lookingFor || post?.isLookingFor),
    [post]
  );
  const isSeeking = postType === "seeking";
  const kind = useMemo(() => (isSeeking ? normKind(post?.kind) : ""), [isSeeking, post?.kind]);

  // 이미 요청했는지 체크 (로그인 사용자만)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token || !school || !post?._id || !isSeeking) return;
      try {
        const r = await checkRequested({ school, targetId: post._id });
        if (!alive) return;
        setAlready({ exists: !!r?.exists, conversationId: r?.conversationId || null });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [token, school, post?._id, isSeeking]);

  const handleDelete = async () => {
    ensureAuth(async () => {
      if (!window.confirm("Delete this post?")) return;
      try {
        await deleteCareerPost({ school, id: post._id });
        alert("Post deleted.");
        navigate(schoolPath("/dashboard?tab=academic"));
      } catch (err) {
        alert("Delete failed: " + (err.message || "Unknown error"));
      }
    });
  };

  const handleThumb = async () => {
    ensureAuth(async () => {
      try {
        await toggleCareerThumbs({ school, id: post._id });
        await loadPost();
      } catch (err) {
        alert("Failed to like: " + (err.message || "Unknown error"));
      }
    });
  };

  const handleSaveEdit = async () => {
    ensureAuth(async () => {
      const title = editTitle.trim();
      const content = editContent.trim();
      if (!title) return;
      setSaving(true);
      try {
        const updated = await updateCareerPost({
          school,
          id: post._id,
          title,
          content,
          postType, // keep current type
          kind,     // keep current kind
        });
        const next = updated?.post || updated;
        setPost(next);
        setIsEditing(false);
      } catch (err) {
        alert("Update failed: " + (err.message || "Unknown error"));
      } finally {
        setSaving(false);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditTitle(post?.title || "");
    setEditContent(post?.content || "");
    setIsEditing(false);
  };

  const openRequest = () =>
    ensureAuth(() => {
      if (already.exists && already.conversationId) {
        navigate(schoolPath(`/messages?conversation=${already.conversationId}`));
      } else {
        setReqOpen(true);
      }
    });

  const submitRequest = () =>
    ensureAuth(async () => {
      if (!isSeeking) return;
      const text = (reqMsg || "").trim();
      if (!text) {
        alert("Write a short hello message.");
        return;
      }
      setSending(true);
      try {
        const r = await sendRequest({ school, targetId: post._id, initialMessage: text });
        const cid = r?.conversationId;
        if (cid) {
          setReqOpen(false);
          navigate(schoolPath(`/messages?conversation=${cid}`));
        } else {
          alert("Sent, but failed to find the conversation ID.");
        }
      } catch (e) {
        alert(e?.message || "Failed to send request.");
      } finally {
        setSending(false);
      }
    });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-red-700"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}>
        {error}
      </div>
    );
  }
  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-600"
        style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}>
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
              {/* small badge */}
              <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
                {postType === "question" ? "General Question" : `Seeking · ${kindLabel(kind)}`}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Posted by <span className="font-medium">anonymous</span> • {dayjs(post.createdAt).fromNow()}
            </p>
          </div>

          <div className="p-5 sm:p-6">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Content"
                className="h-56 w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            ) : (
              <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-900">{post.content}</div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              {/* <button
                onClick={handleThumb}
                disabled={isAuthor}
                className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
                title={isAuthor ? "You can’t like your own post." : "Like post"}
              >
                👍 Like
              </button> */}
              <span className="text-xs text-gray-500">{post.thumbsUpUsers?.length || 0} likes</span>
            </div>
            <div className="flex items-center gap-2">
              {isAuthor && !isEditing && (
                <>
                  <button onClick={() => setIsEditing(true)} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">✏️ Edit</button>
                  <button onClick={handleDelete} className="rounded-lg border px-3 py-1 text-sm text-red-600 hover:bg-red-50">🗑️ Delete</button>
                </>
              )}
              {isAuthor && isEditing && (
                <>
                  <button onClick={handleSaveEdit} disabled={saving} className="rounded-lg border px-3 py-1 text-sm text-white" style={{ backgroundColor: "#111827" }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1 text-sm">Cancel</button>
                </>
              )}

              {/* ✅ Request 버튼: 오직 'seeking' + 비작성자일 때만 */}
              {!isAuthor && isSeeking && (
                <button
                  onClick={openRequest}
                  className="rounded-lg border px-3 py-1 text-sm"
                  title={already.exists ? "You already requested" : "Send request (first message)"}
                  disabled={already.exists && !!already.conversationId}
                >
                  {already.exists && already.conversationId ? "Requested" : "Send request"}
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 p-5 sm:p-6">
            <CommentSection postId={post._id} authorEmail={post.email} />
          </div>
        </div>

        <div className="mt-6">
          <button onClick={() => navigate(schoolPath("/dashboard?tab=academic"))} className="text-sm text-gray-600 hover:underline">
            ← Back to list
          </button>
        </div>
      </div>

      {/* simple modal */}
      {reqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Send request</h3>
            <p className="mb-3 text-sm text-gray-600">
              This sends your first message to the author. A conversation will be created.
            </p>
            <textarea
              value={reqMsg}
              onChange={(e) => setReqMsg(e.target.value)}
              placeholder="Say hello and what you’re looking for…"
              className="h-28 w-full resize-none rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setReqOpen(false)} className="rounded-lg border px-3 py-1 text-sm">Cancel</button>
              <button
                onClick={submitRequest}
                disabled={sending}
                className="rounded-lg bg-gray-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




