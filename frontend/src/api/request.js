// frontend/src/api/request.js
import { apiFetch } from "./http";

export async function createRequest({ school, targetId, message }) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  // apiFetch -> 내부 request()가 localStorage/sessionStorage에서 토큰을 읽어
  // Authorization: Bearer <token> 를 자동으로 붙여준다.
  return apiFetch(`${base}/${school}/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { targetId, initialMessage: message },
  });
}

export async function checkRequestExists({ school, targetId }) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const url = new URL(`${base}/${school}/request/exists`);
  url.searchParams.set("targetId", targetId);
  return apiFetch(url.toString(), { method: "GET" });
}



