// frontend/src/api/careerPosts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ============== Public (no auth) ==============
export async function getPublicCareerPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",
  type = "", // 'question' | 'seeking' | 'looking_for' (legacy)
  kind = "", // 'course_materials' | 'study_mate' | 'coffee_chat'
}) {
  const url = new URL(`${API_URL}/public/${school}/career-posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (type) url.searchParams.set("type", type);
  if (kind) url.searchParams.set("kind", kind);
  return getJson(url);
}

export async function getPublicCareerPost({ school, id }) {
  const url = `${API_URL}/public/${school}/career-posts/${id}`;
  return getJson(url);
}

// ============== Protected (auth) ==============
export async function listCareerPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",
  type = "",
  kind = "",
} = {}) {
  const url = new URL(`${API_URL}/${school}/career-posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (type) url.searchParams.set("type", type);
  if (kind) url.searchParams.set("kind", kind);
  return getJson(url);
}

export async function getCareerPost({ school, id }) {
  const url = `${API_URL}/${school}/career-posts/${id}`;
  return getJson(url);
}

/**
 * Create
 * - postType: 'question' | 'seeking'  (legacy type: 'question' | 'looking_for' also ok)
 * - kind: only for seeking ('course_materials'|'study_mate'|'coffee_chat')
 */
export async function createCareerPost({
  school,
  title,
  content = "",
  postType, // preferred modern field
  type,     // legacy alias
  kind = "",
  tags = [],
}) {
  const url = `${API_URL}/${school}/career-posts`;
  return postJson(url, { title, content, postType, type, kind, tags });
}

export async function updateCareerPost({ school, id, title, content, postType, type, kind, tags }) {
  const url = `${API_URL}/${school}/career-posts/${id}`;
  return putJson(url, { title, content, postType, type, kind, tags });
}

export async function deleteCareerPost({ school, id }) {
  const url = `${API_URL}/${school}/career-posts/${id}`;
  return deleteJson(url);
}

export async function toggleCareerThumbs({ school, id }) {
  const url = `${API_URL}/${school}/career-posts/${id}/thumbs`;
  return postJson(url, {});
}

export async function listCareerLiked({ school, email }) {
  const url = `${API_URL}/${school}/career-posts/liked/${encodeURIComponent(email)}`;
  return getJson(url);
}

export async function listCareerCommented({ school, email }) {
  const url = `${API_URL}/${school}/career-posts/commented/${encodeURIComponent(email)}`;
  return getJson(url);
}


