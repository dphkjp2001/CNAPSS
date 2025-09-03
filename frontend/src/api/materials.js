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
  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/materials/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to load material");
  return res.json();
}

// GET /api/:school/materials/recent  (로그인 O)  /api/public/:school/materials/recent (로그인 X)
export async function listRecentMaterials({ school, token, limit = 5, q = "", prof = "" }) {
  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(20, limit))),
  });
  if (q) params.set("q", q);
  if (prof) params.set("prof", prof);

  const base = token
    ? `${API}/${encodeURIComponent(school)}/materials/recent`
    : `${API}/public/${encodeURIComponent(school)}/materials/recent`;

  const init = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const res = await apiFetch(`${base}?${params.toString()}`, init);
  if (!res.ok) throw new Error("Failed to load recent materials");
  return res.json();
}

/* ---------------- Requests (CourseHub 전용) ---------------- */

export async function checkMaterialRequest({ school, token, materialId }) {
  const qs = new URLSearchParams({
    type: "coursehub",
    targetId: String(materialId || "").trim(),
  }).toString();

  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/request/status?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return { alreadySent: false };
  return res.json(); // { alreadySent, conversationId? }
}

export async function sendMaterialRequest({ school, token, materialId, message }) {
  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: "coursehub",
      targetId: String(materialId || "").trim(),
      message: String(message || "").trim(),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 201 || res.status === 200) return data;
  if (res.status === 409) return { alreadySent: true, ...data };
  throw new Error(data?.message || "request failed");
}





