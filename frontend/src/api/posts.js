// frontend/src/api/posts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ---------- Public ----------
export async function getPublicPosts({ school, page = 1, limit = 20, q = "", sort = "new", board } = {}) {
  const url = new URL(`${API}/public/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (board) url.searchParams.set("board", board);
  return getJson(url);
}
export async function getPublicPost({ school, id }) {
  return getJson(`${API}/public/${school}/posts/${id}`);
}

// ---------- Protected ----------
export async function listPosts({ school, page = 1, limit = 20, q = "", sort = "recent", board, mode } = {}) {
  const url = new URL(`${API}/${school}/posts`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("sort", String(sort));
  if (q) url.searchParams.set("q", q);
  if (board) url.searchParams.set("board", board);
  if (mode) url.searchParams.set("mode", mode);
  return getJson(url);
}
export async function getPost({ school, id }) {
  return getJson(`${API}/${school}/posts/${id}`);
}

// Pass-through creator (board/mode/kind supported)
export async function createPost({ school, ...payload }) {
  return postJson(`${API}/${school}/posts`, payload);
}

export async function updatePost({ school, id, ...payload }) {
  return putJson(`${API}/${school}/posts/${id}`, payload);
}
export async function deletePost({ school, id }) {
  return deleteJson(`${API}/${school}/posts/${id}`);
}









