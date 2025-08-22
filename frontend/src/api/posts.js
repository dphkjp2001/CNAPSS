// src/api/posts.js
const BASE = import.meta.env.VITE_API_URL;

// 목록 (학교별)
export const fetchPosts = async (school) => {
  const qs = school ? `?school=${encodeURIComponent(school)}` : "";
  const res = await fetch(`${BASE}/posts${qs}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};

// 단일
export const fetchPostById = async (id) => {
  const res = await fetch(`${BASE}/posts/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load post");
  return data;
};

// 생성 (학교를 반드시 보냄)
export const createPost = async ({ email, nickname, title, content, school }) => {
  const res = await fetch(`${BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nickname, title, content, school }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create post");
  return data;
};

// 수정/삭제/좋아요 (변경 없음)
export const updatePost = async (id, { email, title, content }) => {
  const res = await fetch(`${BASE}/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, title, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update post");
  return data;
};

export const deletePost = async (id, email) => {
  const res = await fetch(`${BASE}/posts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete post");
  return data;
};

export const togglePostLike = async (id, email) => {
  const res = await fetch(`${BASE}/posts/${id}/thumbs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to toggle like");
  return data;
};

// 대시보드용
export const fetchLikedPosts = async (email, school) => {
  const qs = school ? `?school=${encodeURIComponent(school)}` : "";
  const res = await fetch(`${BASE}/posts/liked/${encodeURIComponent(email)}${qs}`);
  if (!res.ok) throw new Error("Failed to fetch liked posts");
  return res.json();
};

export const fetchCommentedPosts = async (email, school) => {
  const qs = school ? `?school=${encodeURIComponent(school)}` : "";
  const res = await fetch(`${BASE}/posts/commented/${encodeURIComponent(email)}${qs}`);
  if (!res.ok) throw new Error("Failed to fetch commented posts");
  return res.json();
};

export const fetchMyPosts = async (email, school) => {
  const qs = school ? `?school=${encodeURIComponent(school)}` : "";
  const res = await fetch(`${BASE}/posts?author=${encodeURIComponent(email)}${qs}`);
  if (!res.ok) throw new Error("Failed to fetch my posts");
  return res.json();
};
