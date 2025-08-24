// frontend/src/api/posts.js
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""); // e.g. https://api.cnapss.com/api

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// 목록
export async function listPosts({ school, token, page, limit } = {}) {
  const url = new URL(`${API_URL}/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load posts");
  return res.json();
}

// 상세
export async function getPost({ school, token, id }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load post");
  return res.json();
}

// 작성
export async function createPost({ school, token, title, content }) {
  const res = await fetch(`${API_URL}/${school}/posts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

// 수정
export async function updatePost({ school, token, id, title, content }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

// 삭제
export async function deletePost({ school, token, id }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete post");
  return res.json();
}

// 좋아요 토글
export async function toggleThumbs({ school, token, id }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}/thumbs`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to toggle like");
  return res.json();
}

// 내가 좋아요한 글
export async function listLiked({ school, token, email }) {
  const res = await fetch(`${API_URL}/${school}/posts/liked/${encodeURIComponent(email)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load liked posts");
  return res.json();
}

// 내가 댓글 단 글
export async function listCommented({ school, token, email }) {
  const res = await fetch(`${API_URL}/${school}/posts/commented/${encodeURIComponent(email)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load commented posts");
  return res.json();
}


// ===== Backward-compat ADAPTERS (keep old imports working) =====
// Old calls used: fetchPosts(school), fetchPostById(id, school), togglePostLike(id, school),
// fetchLikedPosts(email, school), fetchCommentedPosts(email, school)
// These adapters pull token from localStorage so old pages don't need to pass it explicitly.
const tokenFromStorage = () => {
  try { return localStorage.getItem("token"); } catch { return ""; }
};

export async function fetchPosts(school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return listPosts({ school, token });
}

export async function fetchPost(id, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return getPost({ school, token, id });
}

export async function fetchPostById(id, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return getPost({ school, token, id });
}

export async function togglePostLike(id, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return toggleThumbs({ school, token, id });
}

export async function fetchLikedPosts(email, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return listLiked({ school, token, email });
}

export async function fetchCommentedPosts(email, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return listCommented({ school, token, email });
}
// ================================================================
