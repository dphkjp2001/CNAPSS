// frontend/src/api/academicPosts.js
import { getJson, postJson, putJson, deleteJson } from "./http";

/**
 * 쿼리스트링 유틸
 * - 빈 값/undefined/null은 제외
 */
function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/* -------------------------------------------------------
 * Public (no auth)
 * ----------------------------------------------------- */

/**
 * Public list
 * - 서버 라우트: GET /public/:school/academic-posts
 * - type: 'question' | 'seeking' | ''   (FE에서 'all'은 보내지 않음)
 * - kind: 'course_materials' | 'study_mate' | 'coffee_chat' | ''
 */
export async function getPublicAcademicPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",        // 'new' | 'old'
  type = "",           // '' | 'question' | 'seeking'
  kind = "",           // '' | 'course_materials' | 'study_mate' | 'coffee_chat'
}) {
  // 'all'은 서버에 보내지 않음
  const safeType = type === "all" ? "" : type;

  const qs = buildQuery({
    page,
    limit,
    q,
    sort,
    type: safeType || undefined,
    kind: safeType === "seeking" ? (kind || undefined) : undefined,
  });

  // ✅ 상대경로 사용: 프록시/동일 오리진에서 안정적
  return getJson(`/public/${encodeURIComponent(school)}/academic-posts${qs}`);
}

/**
 * Public detail
 * - 서버 라우트: GET /public/:school/academic-posts/:id
 */
export async function getPublicAcademicPost({ school, id }) {
  return getJson(
    `/public/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`
  );
}

/* -------------------------------------------------------
 * Protected (auth)
 * ----------------------------------------------------- */

/**
 * Protected detail
 * - 서버 라우트: GET /:school/academic-posts/:id
 */
export async function getAcademicPost({ school, id }) {
  return getJson(`/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`);
}

/**
 * Create (auth)
 * - postType: 'question' | 'seeking'
 * - seeking + course_materials:
 *    - courseName (없으면 title을 courseName으로 미러링)
 *    - professor? (optional)
 *    - materials? (['lecture_notes','syllabus','past_exams','quiz_prep'])
 */
export async function createAcademicPost({
  school,
  title,
  content = "",
  postType, // or type/mode; 서버에서 normalize됨
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
  const body = { title, content, postType, type, mode, kind, tags, images };

  if (kind === "course_materials") {
    body.courseName = courseName ?? title;
    if (professor) body.professor = professor;
    if (Array.isArray(materials)) body.materials = materials;
  }

  return postJson(`/${encodeURIComponent(school)}/academic-posts`, body);
}

/**
 * Update (auth)
 */
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
  const body = { title, content, postType, type, mode, kind, tags, images };

  if (kind === "course_materials") {
    body.courseName = courseName ?? title;
    if (professor) body.professor = professor;
    if (Array.isArray(materials)) body.materials = materials;
  }

  return putJson(`/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`, body);
}

/**
 * Delete (auth)
 */
export async function deleteAcademicPost({ school, id }) {
  return deleteJson(`/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`);
}


