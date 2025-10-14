// frontend/src/api/comments.js
import { apiFetch } from "./http";
// import { useSchoolPath } from "../utils/schoolPath";
// const schoolPath = useSchoolPath();


// NOTE: VITE_API_URL may already include `/api` (e.g., https://api.cnapss.com/api).
// We will NOT add another `/api`. Just append endpoint paths after this base.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Common headers
const authHeaders = (token) =>
  token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { "Content-Type": "application/json" };

// ------- Public (no auth) -------
async function getPublicComments({ school, postId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_BASE}/public/${s}/comments/${postId}`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

// ------- List -------
export async function listComments({ school, token, postId }) {
  const s = String(school || "").toLowerCase().trim();

  // If no token, use public endpoint to avoid 401/gate for guests
  if (!token) return getPublicComments({ school: s, postId });

  const res = await fetch(`${API_BASE}/${s}/comments/${postId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

// ------- Create -------
export async function addComment({ school, token, postId, content, parentId = null }) {
  const s = String(school || "").toLowerCase().trim();
  const body = { content: String(content || "").trim() };
  if (parentId) body.parentId = String(parentId);

  const res = await fetch(`${API_BASE}/${s}/comments/${postId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

// ------- Update -------
export async function updateComment({ school, token, commentId, content }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_BASE}/${s}/comments/${commentId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to update comment");
  return res.json();
}

// ------- Delete -------
export async function deleteComment({ school, token, commentId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_BASE}/${s}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete comment");
  return res.json();
}

// ------- Thumbs toggle -------
export async function toggleCommentThumbs({ school, token, commentId }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_BASE}/${s}/comments/${commentId}/thumbs`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to toggle comment like");
  return res.json();
}



