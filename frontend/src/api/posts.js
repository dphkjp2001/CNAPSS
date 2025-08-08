// src/api/posts.js
const BASE = import.meta.env.VITE_API_URL;

// 📌 모든 게시글 가져오기
export const fetchPosts = async () => {
  const res = await fetch(`${BASE}/posts`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};

// 📌 단일 게시글 가져오기
export const fetchPostById = async (id) => {
  const res = await fetch(`${BASE}/posts/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load post");
  return data;
};

// 📌 게시글 생성
export const createPost = async ({ email, nickname, title, content }) => {
  const res = await fetch(`${BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nickname, title, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create post");
  return data;
};

// 📌 게시글 수정
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

// 📌 게시글 삭제
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

// 📌 좋아요 토글
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
