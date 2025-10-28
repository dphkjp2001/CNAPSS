// frontend/src/api/posts.js
import { getJson, postJson, putJson, deleteJson } from "./http";
import axios from "axios";


function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function listMyPosts({ school }) {
  return fetchJson(`/api/${encodeURIComponent(school)}/posts/my`);
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

  const candidates = [
    `/${s}/posts`,
    `/${s}/freeboard/posts`,
    `/${s}/post`,
    `/${s}/freeboard`,
  ];

  let lastErr;
  for (const url of candidates) {
    try {
      return await postJson(url, body);
    } catch (err) {
      if (err?.status !== 404) throw err;
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

// (legacy thumbs)
export function toggleThumbs({ school, id }) {
  return postJson(`/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}/like`, {});
}

// ✅ NEW: Up/Down vote
export function votePost({ school, id, dir }) {
  // dir: "up" | "down"
  return postJson(`/${encodeURIComponent(school)}/posts/${encodeURIComponent(id)}/vote`, { dir });
}


export async function listPosts({ school, token }) {
  const res = await axios.get(`/api/${school}/posts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}


