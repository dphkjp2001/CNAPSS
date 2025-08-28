// frontend/src/api/posts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

// e.g. VITE_API_URL = "https://api.cnapss.com/api"
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

// ============== Protected (auth) ==============
// 주의: getJson/postJson 등은 내부적으로 apiFetch를 사용하고,
// apiFetch가 localStorage의 token을 자동으로 Authorization에 주입해준다.
// (별도로 headers를 안 넘겨도 됨. 필요하면 { headers: { Authorization: `Bearer ${token}` } } 가능)

export async function listPosts({ school, page, limit } = {}) {
  const url = new URL(`${API_URL}/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  return getJson(url);
}

export async function getPost({ school, id }) {
  const url = `${API_URL}/${school}/posts/${id}`;
  return getJson(url);
}

export async function createPost({ school, title, content }) {
  const url = `${API_URL}/${school}/posts`;
  return postJson(url, { title, content });
}

export async function updatePost({ school, id, title, content }) {
  const url = `${API_URL}/${school}/posts/${id}`;
  return putJson(url, { title, content });
}

export async function deletePost({ school, id }) {
  const url = `${API_URL}/${school}/posts/${id}`;
  return deleteJson(url);
}

export async function toggleThumbs({ school, id }) {
  const url = `${API_URL}/${school}/posts/${id}/thumbs`;
  // 토글은 바디가 필요 없으니 postJson 대신 apiFetch를 써도 되지만 일관성 위해 빈 객체 전송
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

/* ---- 구버전 API 어댑터 (기존 코드 호환용) ---- */
export async function fetchPosts(school) {
  return listPosts({ school });
}
export async function fetchPost(id, school) {
  return getPost({ school, id });
}
export async function fetchPostById(id, school) {
  return getPost({ school, id });
}
export async function togglePostLike(id, school) {
  return toggleThumbs({ school, id });
}
export async function fetchLikedPosts(email, school) {
  return listLiked({ school, email });
}
export async function fetchCommentedPosts(email, school) {
  return listCommented({ school, email });
}
