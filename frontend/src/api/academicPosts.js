// frontend/src/api/academicPosts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ============== Public (no auth) ==============
export async function getPublicAcademicPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",
  type = "", // 'question' | 'seeking' | 'looking_for'
  kind = "", // 'course_materials' | 'study_mate' | 'coffee_chat'
}) {
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
  const url = `${API_URL}/public/${school}/academic-posts/${id}`;
  return getJson(url);
}

// ============== Protected (auth) ==============
export async function listAcademicPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",
  type = "",
  kind = "",
} = {}) {
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
  const url = `${API_URL}/${school}/academic-posts/${id}`;
  return getJson(url);
}

/**
 * Create
 * - mode: 'general' | 'looking_for'  (aliases: postType/type 'question'|'seeking' OK)
 * - kind: only for looking_for ('course_materials'|'study_mate'|'coffee_chat')
 */
export async function createAcademicPost({
  school,
  title,
  content = "",
  postType, // 'question' | 'seeking' (alias)
  type,     // alias
  mode,     // preferred: 'general' | 'looking_for'
  kind = "",
  tags = [],
  images = [],
}) {
  const url = `${API_URL}/${school}/academic-posts`;
  // normalize: if postType/type provided, mode is derived server-side too
  return postJson(url, { title, content, postType, type, mode, kind, tags, images });
}

export async function updateAcademicPost({ school, id, title, content, postType, type, mode, kind, tags, images }) {
  const url = `${API_URL}/${school}/academic-posts/${id}`;
  return putJson(url, { title, content, postType, type, mode, kind, tags, images });
}

export async function deleteAcademicPost({ school, id }) {
  const url = `${API_URL}/${school}/academic-posts/${id}`;
  return deleteJson(url);
}
