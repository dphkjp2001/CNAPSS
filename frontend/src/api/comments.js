// frontend/src/api/comments.js
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const authHeaders = (token) =>
  token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { "Content-Type": "application/json" };

// ✅ 공개 GET 경로(비로그인)
async function getPublicComments({ school, postId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/public/${s}/comments/${postId}`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

export async function listComments({ school, token, postId }) {
  const s = String(school || "").toLowerCase().trim();

  // 토큰 없으면 → 공개 엔드포인트 사용(401 발생 방지, 게이트 안뜸)
  if (!token) {
    return getPublicComments({ school: s, postId });
  }

  const res = await fetch(`${API_URL}/${s}/comments/${postId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

export async function addComment({ school, token, postId, content, parentId = null }) {
  const s = String(school || "").toLowerCase().trim();
  const body = { content: String(content || "").trim() };
  if (parentId) body.parentId = String(parentId);

  const res = await fetch(`${API_URL}/${s}/comments/${postId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

export async function updateComment({ school, token, commentId, content }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/comments/${commentId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to update comment");
  return res.json();
}

export async function deleteComment({ school, token, commentId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete comment");
  return res.json();
}

export async function toggleCommentThumbs({ school, token, commentId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/comments/${commentId}/thumbs`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to toggle comment like");
  return res.json();
}


