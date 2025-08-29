// frontend/src/api/materials.js
import { apiFetch } from "./http";

export async function createMaterial({ school, token, payload }) {
  return apiFetch(`${import.meta.env.VITE_API_URL}/api/${school}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function listMaterials({ school, token, course, semester, kind = "all", sort = "new", page = 1, limit = 50 }) {
  const qs = new URLSearchParams({
    course,
    semester,
    kind,
    sort,
    page: String(page),
    limit: String(limit),
  });
  return apiFetch(`${import.meta.env.VITE_API_URL}/api/${school}/materials?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMaterial({ school, token, id }) {
  return apiFetch(`${import.meta.env.VITE_API_URL}/api/${school}/materials/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
