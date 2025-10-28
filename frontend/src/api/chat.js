// frontend/src/api/chat.js
import { getJson, postJson } from "./http";
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/** List conversations (scoped by school) */
export function getConversations({ school, token }) {
  return getJson(`${API}/${school}/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Messages in a conversation (newest first on UI via reverse) */
export function getMessages({ school, token, conversationId, cursor, limit = 50 }) {
  const url = new URL(`${API}/${school}/chat/conversations/${conversationId}/messages`);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", String(limit));
  return getJson(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
}

/** Send a message */
export function sendMessage({ school, token, conversationId, content }) {
  return postJson(
    `${API}/${school}/chat/conversations/${conversationId}/messages`,
    { content },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/** Mark as read */
export function markRead({ school, token, conversationId }) {
  return postJson(
    `${API}/${school}/chat/conversations/${conversationId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

/** Start (or reuse) a conversation — supports optional initialMessage */
export function startConversation({ school, token, peerEmail, itemId, initialMessage }) {
  return postJson(
    `${API}/${school}/chat/start`,
    { peerEmail, itemId, initialMessage },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}





