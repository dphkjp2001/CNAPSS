// frontend/src/api/reviews.js
import { apiFetch } from "./http";

export async function createReview(school, payload) {
  return apiFetch(`/reviews`, {
    method: "POST",
    body: payload,
    schoolScoped: true,
  });
}

// --- Course-centric ---
export async function getCourseBreakdown(school, courseId) {
  return apiFetch(`/reviews/course/${courseId}/breakdown`, {
    method: "GET",
    schoolScoped: true,
  });
}

export async function getCourseSummary(school, courseId) {
  return apiFetch(`/reviews/course/${courseId}/summary`, {
    method: "GET",
    schoolScoped: true,
  });
}

export async function listCourseReviews(school, courseId, { professorId, page = 1, limit = 10 } = {}) {
  const qs = new URLSearchParams({ page, limit });
  if (professorId) qs.set("professorId", professorId);
  return apiFetch(`/reviews/course/${courseId}/list?${qs.toString()}`, {
    method: "GET",
    schoolScoped: true,
  });
}

// --- Professor-centric ---
export async function getProfessorBreakdown(school, professorId) {
  return apiFetch(`/reviews/professor/${professorId}/breakdown`, {
    method: "GET",
    schoolScoped: true,
  });
}

export async function listProfessorReviews(school, professorId, { courseId, page = 1, limit = 10 } = {}) {
  const qs = new URLSearchParams({ page, limit });
  if (courseId) qs.set("courseId", courseId);
  return apiFetch(`/reviews/professor/${professorId}/list?${qs.toString()}`, {
    method: "GET",
    schoolScoped: true,
  });
}

