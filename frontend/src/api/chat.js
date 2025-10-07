import { getJson, postJson } from "./http";
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/** 내 대화 목록(학교 스코프) */
export function getConversations({ school, token }) {
  return getJson(`${API}/${school}/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 대화 메시지(신규가 위로 오므로 UI에서 reverse) */
export function getMessages({ school, token, conversationId, cursor, limit = 50 }) {
  const url = new URL(`${API}/${school}/chat/conversations/${conversationId}/messages`);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", String(limit));
  return getJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
}

/** 메시지 전송 */
export function sendMessage({ school, token, conversationId, content }) {
  return postJson(
    `${API}/${school}/chat/conversations/${conversationId}/messages`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/** 읽음 처리 */
export function markRead({ school, token, conversationId }) {
  return postJson(
    `${API}/${school}/chat/conversations/${conversationId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/** 대화 시작(없으면 생성) */
export function startConversation({ school, token, peerEmail, itemId }) {
  return postJson(
    `${API}/${school}/chat/start`,
    { peerEmail, itemId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}




