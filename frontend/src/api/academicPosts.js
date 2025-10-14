// frontend/src/api/academicPosts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/* -------------------- Public (no auth) -------------------- */
// List (public)
export async function getPublicAcademicPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",          // 'new' | 'old' | 'mostliked' (백엔드 허용값에 맞춤)
  type = "",            // 'question' | 'seeking' | 'looking_for' | ''
  kind = "",            // 'course_materials' | 'study_mate' | 'coffee_chat' | ''
}) {
  const url = new URL(`${API_URL}/public/${school}/academic-posts`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (type) url.searchParams.set("type", type);
  if (kind) url.searchParams.set("kind", kind);
  return getJson(url.toString());
}

// Detail (public)  ✅ AcademicDetail.jsx가 이 함수를 import 합니다.
export async function getPublicAcademicPost({ school, id }) {
  const url = `${API_URL}/public/${school}/academic-posts/${id}`;
  return getJson(url);
}

/* -------------------- Auth required -------------------- */
// Detail (protected) — 필요하면 사용
export async function getAcademicPost({ school, id }) {
  const url = `${API_URL}/${school}/academic-posts/${id}`;
  return getJson(url);
}

/**
 * Create Academic post
 * - postType: 'question' | 'seeking'
 * - kind: only for seeking ('course_materials' | 'study_mate' | 'coffee_chat')
 * - extras for course_materials:
 *    - courseName (required; we also mirror to title)
 *    - professor? (optional)
 *    - materials[] (['lecture_notes','syllabus','past_exams','quiz_prep'])
 */
export async function createAcademicPost({
  school,
  title,
  content = "",
  postType,   // or type/mode; 서버에서 normalize
  type,
  mode,
  kind,
  tags,
  images,

  // course_materials extras
  courseName,
  professor,
  materials,
}) {
  const url = `${API_URL}/${school}/academic-posts`;
  const body = { title, content, postType, type, mode, kind, tags, images };

  if (kind === "course_materials") {
    body.courseName = courseName ?? title;
    if (professor) body.professor = professor;
    if (Array.isArray(materials)) body.materials = materials;
  }

  return postJson(url, body);
}

export async function updateAcademicPost({
  school,
  id,
  title,
  content,
  postType,
  type,
  mode,
  kind,
  tags,
  images,

  // course_materials extras
  courseName,
  professor,
  materials,
}) {
  const url = `${API_URL}/${school}/academic-posts/${id}`;
  const body = { title, content, postType, type, mode, kind, tags, images };

  if (kind === "course_materials") {
    body.courseName = courseName ?? title;
    if (professor) body.professor = professor;
    if (Array.isArray(materials)) body.materials = materials;
  }

  return putJson(url, body);
}

export async function deleteAcademicPost({ school, id }) {
  const url = `${API_URL}/${school}/academic-posts/${id}`;
  return deleteJson(url);
}



