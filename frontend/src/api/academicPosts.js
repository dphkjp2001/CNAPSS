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
export async function getPublicAcademicPosts({
  school,
  page = 1,
  limit = 20,
  q = "",
  sort = "new",
  type = "",
  kind = "",
}) {
  const safeType = type === "all" ? "" : type;
  const qs = buildQuery({
    page,
    limit,
    q,
    sort,
    type: safeType || undefined,
    kind: safeType === "seeking" ? (kind || undefined) : undefined,
  });
  return getJson(`/public/${encodeURIComponent(school)}/academic-posts${qs}`);
}

export async function getPublicAcademicPost({ school, id }) {
  return getJson(
    `/public/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`
  );
}

/* -------------------------------------------------------
 * Protected (auth)
 * ----------------------------------------------------- */

export async function getAcademicPost({ school, id }) {
  return getJson(`/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`);
}

export async function createAcademicPost({
  school,
  title,
  content = "",
  postType,
  type,
  mode,
  kind,
  tags,
  images,
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

export async function deleteAcademicPost({ school, id }) {
  return deleteJson(`/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}`);
}

/**
 * ⬇️ “내 아카데믹 글” 목록 (프론트 필터 전제)
 * - 서버는 mine 파라미터를 지원하지 않으므로, 여기서는 단순히 최신 200개를 받아오게 하고
 *   실제 필터링은 MyPosts.jsx에서 author 기준으로 수행한다.
 */
export async function listMyAcademicPosts({
  school,
  page = 1,
  limit = 200,
  sort = "new",
}) {
  const qs = buildQuery({ page, limit, sort });
  // 서버 응답 형태는 { data: [...], paging: {...} } 형태이므로,
  // 호출부에서 data를 pluck 하도록 둔다.
  return getJson(`/${encodeURIComponent(school)}/academic-posts${qs}`);
}

export function voteAcademicPost({ school, id, dir }) {
  return postJson(
    `/${encodeURIComponent(school)}/academic-posts/${encodeURIComponent(id)}/vote`,
    { dir }
  );
}


