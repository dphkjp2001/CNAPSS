// src/api/posts.js
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

// 목록 (학교별)
export const fetchPosts = async (school) => {
  if (!school) return [];
  return request(`/posts?school=${encodeURIComponent(school)}`);
};

// 단일 (학교 스코프)
export const fetchPostById = async (id, school) => {
  return request(`/posts/${id}?school=${encodeURIComponent(school)}`);
};

// 생성
export const createPost = async ({ email, nickname, title, content, school }) => {
  if (!school) throw new Error("School is required.");
  return request(`/posts`, {
    method: "POST",
    body: { email, nickname, title, content, school },
  });
};

// 수정/삭제/좋아요
export const updatePost = async (id, { email, title, content }) =>
  request(`/posts/${id}`, { method: "PUT", body: { email, title, content } });

export const deletePost = async (id, email) =>
  request(`/posts/${id}`, { method: "DELETE", body: { email } });

export const togglePostLike = async (id, email) =>
  request(`/posts/${id}/thumbs`, { method: "POST", body: { email } });

// 대시보드용
export const fetchLikedPosts = async (email, school) =>
  request(`/posts/liked/${encodeURIComponent(email)}?school=${encodeURIComponent(school)}`);

export const fetchCommentedPosts = async (email, school) =>
  request(`/posts/commented/${encodeURIComponent(email)}?school=${encodeURIComponent(school)}`);

export const fetchMyPosts = async (email, school) =>
  request(`/posts?author=${encodeURIComponent(email)}&school=${encodeURIComponent(school)}`);

