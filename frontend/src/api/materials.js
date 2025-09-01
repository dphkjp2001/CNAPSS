// frontend/src/api/materials.js
import { apiFetch } from "./http";

// VITE_API_URL already includes "/api", e.g. https://api.cnapss.com/api
const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// POST /api/:school/materials
export async function createMaterial({ school, token, payload }) {
  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create material");
  return res.json();
}

// GET /api/:school/materials?course=&semester=&kind=&sort=&page=&limit=
export async function listMaterials({
  school,
  token,
  course,
  semester,
  kind = "all",
  sort = "new",
  page = 1,
  limit = 50,
}) {
  const qs = new URLSearchParams({
    course: course || "",
    semester: semester || "",
    kind,
    sort,
    page: String(page),
    limit: String(limit),
  }).toString();

  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/materials?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load materials");
  return res.json();
}

// GET /api/:school/materials/:id
export async function getMaterial({ school, token, id }) {
  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/materials/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load material");
  return res.json();
}

// GET /api/:school/materials/recent?limit=
export async function listRecentMaterials({ school, token, limit = 5 }) {
  const qs = new URLSearchParams({
    limit: String(Math.max(1, Math.min(20, limit))),
  }).toString();

  const init = { headers: {} };
  if (token) init.headers.Authorization = `Bearer ${token}`;

  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/materials/recent?${qs}`, init);
  if (!res.ok) throw new Error("Failed to load recent materials");
  return res.json();
}

