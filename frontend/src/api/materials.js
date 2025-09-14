// frontend/src/api/materials.js
import { apiFetch } from "./http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// POST /api/:school/materials
export async function createMaterial({ school, token, payload }) {
  // strip legacy field
  const { materialType, ...rest } = payload || {};
  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rest),
  });
  if (!res.ok) throw new Error("Failed to create material");
  return res.json();
}

// GET /api/:school/materials?...
export async function listMaterials({
  school,
  token,
  course,
  semester,
  kind = "all",
  sort = "new",
  page = 1,
  limit = 50,
  type = "all",
}) {
  const qs = new URLSearchParams({
    course: course || "",
    semester: semester || "",
    kind,
    sort,
    page: String(page),
    limit: String(limit),
  });
  if (type && type !== "all") qs.set("type", type);

  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/materials?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load materials");
  return res.json();
}

// Public detail (no auth)
export async function getPublicMaterial({ school, id }) {
  const res = await apiFetch(
    `${API}/public/${encodeURIComponent(school)}/materials/${encodeURIComponent(id)}`
  );
  if (!res.ok) throw new Error("Failed to load material");
  return res.json();
}

// Protected detail (auth)
export async function getMaterial({ school, token, id }) {
  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/materials/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to load material");
  return res.json();
}

// Recent list (public or protected)
export async function listRecentMaterials({
  school,
  token,
  page = 1,
  limit = 20,
  q = "",
  prof = "",
  type = "all",
} = {}) {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    limit: String(Math.max(1, Math.min(50, limit))),
  });
  if (q) params.set("q", q);
  if (prof) params.set("prof", prof);
  if (type && type !== "all") params.set("type", type);

  const base = token
    ? `${API}/${encodeURIComponent(school)}/materials/recent`
    : `${API}/public/${encodeURIComponent(school)}/materials/recent`;

  const init = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const res = await apiFetch(`${base}?${params.toString()}`, init);
  if (!res.ok) throw new Error("Failed to load recent materials");
  return res.json();
}

/* Requests */
export async function checkMaterialRequest({ school, token, materialId, reqType = "coursehub" }) {
  const qs = new URLSearchParams({
    type: String(reqType || "coursehub"),
    targetId: String(materialId || "").trim(),
  }).toString();

  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/request/status?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return { alreadySent: false };
  return res.json();
}

export async function sendMaterialRequest({ school, token, materialId, message, reqType = "coursehub" }) {
  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: String(reqType || "coursehub"),
      targetId: String(materialId || "").trim(),
      message: String(message || "").trim(),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 201 || res.status === 200) return data;
  if (res.status === 409) return { alreadySent: true, ...data };
  throw new Error(data?.message || "request failed");
}










