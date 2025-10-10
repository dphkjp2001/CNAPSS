// // frontend/src/api/posts.js
// import { getJson, postJson, putJson, deleteJson } from "./http";

// const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// // ============== Public (no auth) ==============
// export async function getPublicPosts({ school, page = 1, limit = 20, q = "", sort = "new" }) {
//   const url = new URL(`${API_URL}/public/${school}/posts`);
//   if (page) url.searchParams.set("page", String(page));
//   if (limit) url.searchParams.set("limit", String(limit));
//   if (q) url.searchParams.set("q", q);
//   if (sort) url.searchParams.set("sort", sort);
//   return getJson(url);
// }

// export async function getPublicPost({ school, id }) {
//   const url = `${API_URL}/public/${school}/posts/${id}`;
//   return getJson(url);
// }

// // ============== Protected (auth) ==============
// export async function listPosts({ school, page = 1, limit = 20, q = "", sort = "new" } = {}) {
//   const url = new URL(`${API_URL}/${school}/posts`);
//   if (page) url.searchParams.set("page", String(page));
//   if (limit) url.searchParams.set("limit", String(limit));
//   if (q) url.searchParams.set("q", q);
//   if (sort) url.searchParams.set("sort", sort);
//   return getJson(url);
// }

// export async function getPost({ school, id }) {
//   const url = `${API_URL}/${school}/posts/${id}`;
//   return getJson(url);
// }

// export async function createPost({ school, title, content, images = [] }) {
//   const url = `${API_URL}/${school}/posts`;
//   return postJson(url, { title, content, images }); // ✅ 이미지 함께 전송
// }

// export async function updatePost({ school, id, title, content, images }) {
//   const url = `${API_URL}/${school}/posts/${id}`;
//   return putJson(url, { title, content, images });
// }

// export async function deletePost({ school, id }) {
//   const url = `${API_URL}/${school}/posts/${id}`;
//   return deleteJson(url);
// }

// export async function toggleThumbs({ school, id }) {
//   const url = `${API_URL}/${school}/posts/${id}/thumbs`;
//   return postJson(url, {});
// }

// export async function listLiked({ school, email }) {
//   const url = `${API_URL}/${school}/posts/liked/${encodeURIComponent(email)}`;
//   return getJson(url);
// }

// export async function listCommented({ school, email }) {
//   const url = `${API_URL}/${school}/posts/commented/${encodeURIComponent(email)}`;
//   return getJson(url);
// }

// /* ---- Legacy adapters ---- */
// export async function fetchPosts(school) { return listPosts({ school }); }
// export async function fetchPost(id, school) { return getPost({ school, id }); }
// export async function fetchPostById(id, school) { return getPost({ school, id }); }
// export async function togglePostLike(id, school) { return toggleThumbs({ school, id }); }
// export async function fetchLikedPosts(email, school) { return listLiked({ school, email }); }
// export async function fetchCommentedPosts(email, school) { return listCommented({ school, email }); }




// frontend/src/api/posts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/* 공개(비로그인) */
export function getPublicPosts({ school, page, limit, q, sort } = {}) {
  const qs = buildQuery({ page, limit, q, sort });
  return getJson(`/public/${encodeURIComponent(school)}/posts${qs}`);
}
export function getPublicPost({ school, id }) {
  return getJson(`/public/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}`);
}

/* 보호(로그인 필요) */
export async function createPost({ school, title, content, images }) {
  const body = { title, content, images };
  const s = encodeURIComponent(school);

  // ✅ 1차: 기존 경로
  const candidates = [
    `/${s}/posts`,
    // ✅ 2차~: 혹시 백엔드가 다른 네이밍인 경우 폴백
    `/${s}/freeboard/posts`,
    `/${s}/post`,
    `/${s}/freeboard`,
  ];

  let lastErr;
  for (const url of candidates) {
    try {
      return await postJson(url, body);
    } catch (err) {
      if (err?.status !== 404) throw err; // 404 외 에러는 그대로
      lastErr = err;
    }
  }
  throw lastErr || new Error("Create post failed: no route matched.");
}

export function getPost({ school, id }) {
  return getJson(`/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}`);
}
export function updatePost({ school, id, title, content }) {
  return putJson(`/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}`, { title, content });
}
export function deletePost({ school, id }) {
  return deleteJson(`/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}`);
}
export function toggleThumbs({ school, id }) {
  return postJson(`/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}/thumbs`, {});
}
