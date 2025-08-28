// src/api/materials.js
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
