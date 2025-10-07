// frontend/src/api/request.js
import { getJson, postJson } from "./http";
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/** "Looking for" 글에 대한 요청(=첫 메시지) 전송 */
export function sendRequest({ school, targetId, initialMessage }) {
  return postJson(`${API}/${school}/request`, { targetId, initialMessage });
}

/** 내가 이미 요청했는지 확인 (버튼 상태용) */
export function checkRequested({ school, targetId }) {
  const url = new URL(`${API}/${school}/request/exists`);
  url.searchParams.set("targetId", targetId);
  return getJson(url.toString());
}

