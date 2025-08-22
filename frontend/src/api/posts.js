// src/api/posts.js
const BASE = import.meta.env.VITE_API_URL;

// 공통 헤더로 x-school 넣기
function withSchool(init = {}, school) {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(school ? { "x-school": school } : {}),
    },
  };
}

// 📌 목록
export const fetchPosts = async (school) => {
  const res = await fetch(`${BASE}/posts${school ? `?school=${encodeURIComponent(school)}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};

// 📌 상세
export const fetchPostById = async (id) => {
  const res = await fetch(`${BASE}/posts/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load post");
  return data;
};

// 📌 생성 (school 필요)
export const createPost = async ({ email, nickname, title, content, school }) => {
  const res = await fetch(`${BASE}/posts`, withSchool({
    method: "POST",
    body: JSON.stringify({ email, nickname, title, content, school }),
  }, school));
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create post");
  return data;
};

// 📌 수정
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

// 📌 삭제
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
