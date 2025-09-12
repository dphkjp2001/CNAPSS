// frontend/src/api/posts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/**
 * 내부 헬퍼: 1순위 경로가 404면 2순위 경로로 재시도
 * - 서버는 /api/public/:school/... 형태를 사용하므로
 *   보통 fallback(B) 경로가 성공한다.
 */
async function getWithFallback(primary, fallback) {
  try {
    return await getJson(primary);
  } catch (e) {
    const msg = String(e?.message || e || "");
    const status = e?.status || (msg.includes("404") ? 404 : 0);
    if (status === 404 && fallback) {
      return getJson(fallback);
    }
    throw e;
  }
}

// Public (no auth)
export async function getPublicPosts({ school, page = 1, limit = 20, q = "", sort = "new" }) {
  const baseA = new URL(`${API_URL}/${school}/public/posts`);
  const baseB = new URL(`${API_URL}/public/${school}/posts`);

  if (page) baseA.searchParams.set("page", String(page));
  if (limit) baseA.searchParams.set("limit", String(limit));
  if (q) baseA.searchParams.set("q", q);
  if (sort) baseA.searchParams.set("sort", sort);
  baseB.search = baseA.search;

  return getWithFallback(baseA, baseB);
}

export async function getPublicPost({ school, id }) {
  // ✅ 단건 공개 엔드포인트가 추가되었으므로 정상 동작
  const primary = `${API_URL}/${school}/public/posts/${id}`;
  const fallback = `${API_URL}/public/${school}/posts/${id}`;
  return getWithFallback(primary, fallback);
}

// Protected (auth)
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




