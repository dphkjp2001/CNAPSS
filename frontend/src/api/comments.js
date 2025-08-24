// src/api/comments.js
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export async function listComments({ school, token, postId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/comments/${postId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

export async function addComment({ school, token, postId, content, parentId = null }) {
  const s = String(school || "").toLowerCase().trim();
  const body = { content: String(content || "").trim() };
  if (parentId) body.parentId = String(parentId);   // ✅ send parentId!

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

