// frontend/src/api/academicPosts.js
import { getJson, postJson, putJson, deleteJson } from "./http";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Public
export async function getPublicAcademicPosts({ school, page = 1, limit = 20, q = "", sort = "new", type = "", kind = "" }) {
  const url = new URL(`${API_URL}/public/${school}/academic-posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (type) url.searchParams.set("type", type);
  if (kind) url.searchParams.set("kind", kind);
  return getJson(url);
}
export async function getPublicAcademicPost({ school, id }) {
  return getJson(`${API_URL}/public/${school}/academic-posts/${id}`);
}

// Protected
export async function listAcademicPosts({ school, page = 1, limit = 20, q = "", sort = "new", type = "", kind = "" } = {}) {
  const url = new URL(`${API_URL}/${school}/academic-posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (type) url.searchParams.set("type", type);
  if (kind) url.searchParams.set("kind", kind);
  return getJson(url);
}
export async function getAcademicPost({ school, id }) {
  return getJson(`${API_URL}/${school}/academic-posts/${id}`);
}
export async function createAcademicPost({ school, title, content = "", postType, type, mode, kind = "", tags = [], images = [] }) {
  return postJson(`${API_URL}/${school}/academic-posts`, { title, content, postType, type, mode, kind, tags, images });
}
export async function updateAcademicPost({ school, id, title, content, postType, type, mode, kind, tags, images }) {
  return putJson(`${API_URL}/${school}/academic-posts/${id}`, { title, content, postType, type, mode, kind, tags, images });
}
export async function deleteAcademicPost({ school, id }) {
  return deleteJson(`${API_URL}/${school}/academic-posts/${id}`);
}
