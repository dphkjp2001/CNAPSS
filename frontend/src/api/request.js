// frontend/src/api/request.js
import { getJson, postJson } from "./http";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function createRequest({ school, targetId, message }) {
  return postJson(`${API_URL}/${school}/request`, { targetId, initialMessage: message });
}

export async function checkRequestExists({ school, targetId }) {
  const url = new URL(`${API_URL}/${school}/request/exists`);
  url.searchParams.set("targetId", targetId);
  return getJson(url);
}


