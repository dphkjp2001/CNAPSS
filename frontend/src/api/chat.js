// frontend/src/api/chat.js
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""); // trailing slash 제거

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getConversations({ school, token }) {
  const res = await fetch(`${API_URL}/${school}/chat/conversations`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json();
}

export async function getMessages({ school, token, conversationId, cursor, limit = 50 }) {
  const url = new URL(`${API_URL}/${school}/chat/conversations/${conversationId}/messages`);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

export async function sendMessage({ school, token, conversationId, content }) {
  const res = await fetch(`${API_URL}/${school}/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function markRead({ school, token, conversationId }) {
  const res = await fetch(`${API_URL}/${school}/chat/conversations/${conversationId}/read`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to mark read");
  return res.json();
}

export async function startConversation({ school, token, peerEmail, itemId }) {
  const res = await fetch(`${API_URL}/${school}/chat/start`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ peerEmail, itemId }),
  });
  if (!res.ok) throw new Error("Failed to start conversation");
  return res.json();
}

