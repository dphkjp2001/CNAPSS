import { apiFetch } from "./http";
import { schoolApiPath } from "../utils/schoolPath";

export function listConversations(school) {
  return apiFetch(schoolApiPath(school, "/conversations"));
}

export function ensureConversation(school, toUserId) {
  return apiFetch(schoolApiPath(school, "/conversations"), {
    method: "POST",
    body: JSON.stringify({ toUserId })
  });
}

export function listMessages(school, conversationId, { limit = 30, before } = {}) {
  const params = new URLSearchParams();
  params.set("limit", limit);
  if (before) params.set("before", before);
  return apiFetch(schoolApiPath(school, `/conversations/${conversationId}/messages?${params.toString()}`));
}

export function sendMessage(school, conversationId, { body, attachments = [] }) {
  return apiFetch(schoolApiPath(school, `/conversations/${conversationId}/messages`), {
    method: "POST",
    body: JSON.stringify({ body, attachments })
  });
}

export function markRead(school, conversationId) {
  return apiFetch(schoolApiPath(school, `/conversations/${conversationId}/read`), {
    method: "POST"
  });
}
