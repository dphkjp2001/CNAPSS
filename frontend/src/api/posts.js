// frontend/src/api/posts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ============== Public (no auth) ==============
export async function getPublicPosts({ school, page = 1, limit = 20, q = "", sort = "new" }) {
  const url = new URL(`${API_URL}/public/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  return getJson(url);
}

export async function getPublicPost({ school, id }) {
  const url = `${API_URL}/public/${school}/posts/${id}`;
  return getJson(url);
}

// ============== Protected (auth) ==============
export async function listPosts({ school, page = 1, limit = 20, q = "", sort = "new" } = {}) {
  const url = new URL(`${API_URL}/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  return getJson(url);
}

export async function getPost({ school, id }) {
  const url = `${API_URL}/${school}/posts/${id}`;
  return getJson(url);
}

export async function createPost({ school, title, content, images = [] }) {
  const url = `${API_URL}/${school}/posts`;
  return postJson(url, { title, content, images }); // ✅ 이미지 함께 전송
}

export async function updatePost({ school, id, title, content, images }) {
  const url = `${API_URL}/${school}/posts/${id}`;
  return putJson(url, { title, content, images });
}

export async function deletePost({ school, id }) {
  const url = `${API_URL}/${school}/posts/${id}`;
  return deleteJson(url);
}

export async function toggleThumbs({ school, id }) {
  const url = `${API_URL}/${school}/posts/${id}/thumbs`;
  return postJson(url, {});
}

export async function listLiked({ school, email }) {
  const url = `${API_URL}/${school}/posts/liked/${encodeURIComponent(email)}`;
  return getJson(url);
}

export async function listCommented({ school, email }) {
  const url = `${API_URL}/${school}/posts/commented/${encodeURIComponent(email)}`;
  return getJson(url);
}

/* ---- Legacy adapters ---- */
export async function fetchPosts(school) { return listPosts({ school }); }
export async function fetchPost(id, school) { return getPost({ school, id }); }
export async function fetchPostById(id, school) { return getPost({ school, id }); }
export async function togglePostLike(id, school) { return toggleThumbs({ school, id }); }
export async function fetchLikedPosts(email, school) { return listLiked({ school, email }); }
export async function fetchCommentedPosts(email, school) { return listCommented({ school, email }); }







