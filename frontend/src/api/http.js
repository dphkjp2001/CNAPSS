// frontend/src/api/http.js
import { openGate } from "../utils/gateBus";

/**
 * apiFetch wraps window.fetch
 * - Attaches JWT token from localStorage ("token")
 * - Auto-JSONify plain objects (sets Content-Type)
 * - On 401: open auth gate modal and stop the promise chain
 */
export async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const hasBody = init.body != null;

  // Auto-JSON encode plain objects (but keep FormData as-is)
  let body = init.body;
  if (hasBody && !(body instanceof FormData) && typeof body === "object") {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  // Attach token if present
  const token = localStorage.getItem("token");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers, body });

  // 🔐 Unauthorized → open login gate modal
  if (res.status === 401) {
    try {
      const next = window.location.pathname + window.location.search;
      openGate(next);
    } catch (_) {
      /* no-op */
    }
    // Stop further handling so callers don't continue assuming success
    return new Promise(() => {});
  }

  return res;
}

/* ---------------- Convenience JSON helpers ---------------- */

export async function getJson(url, init) {
  const res = await apiFetch(url, { method: "GET", ...(init || {}) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function postJson(url, data, init) {
  const res = await apiFetch(url, { method: "POST", body: data, ...(init || {}) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function putJson(url, data, init) {
  const res = await apiFetch(url, { method: "PUT", body: data, ...(init || {}) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function patchJson(url, data, init) {
  const res = await apiFetch(url, { method: "PATCH", body: data, ...(init || {}) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

export async function deleteJson(url, init) {
  const res = await apiFetch(url, { method: "DELETE", ...(init || {}) });
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

/* ---------------- Error normalization ---------------- */

async function toApiError(res) {
  let payload = null;
  try {
    payload = await res.clone().json();
  } catch {}
  const err = new Error(payload?.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.payload = payload;
  return err;
}
