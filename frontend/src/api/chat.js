// /:school/chat/* 엔드포인트 래퍼 (이미 올려준 형태 유지)
import { getJson, postJson } from "./http";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getConversations({ school, token }) {
  return getJson(`${API_URL}/${school}/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getMessages({ school, token, conversationId, cursor, limit = 50 }) {
  const url = new URL(`${API_URL}/${school}/chat/conversations/${conversationId}/messages`);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", String(limit));
  return getJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
}

export function sendMessage({ school, token, conversationId, content }) {
  return postJson(
    `${API_URL}/${school}/chat/conversations/${conversationId}/messages`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function markRead({ school, token, conversationId }) {
  return postJson(
    `${API_URL}/${school}/chat/conversations/${conversationId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function startConversation({ school, token, peerEmail, itemId }) {
  return postJson(
    `${API_URL}/${school}/chat/start`,
    { peerEmail, itemId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}



