import { apiFetch } from "./http";
import { schoolApiPath } from "../utils/schoolPath";

export function getBadge(school) {
  return apiFetch(schoolApiPath(school, "/notifications/badge"));
}

export function listNotifications(school, { unreadOnly, limit = 20, cursor } = {}) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unreadOnly", "true");
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return apiFetch(schoolApiPath(school, `/notifications?${params.toString()}`));
}

export function markRead(school, id) {
  return apiFetch(schoolApiPath(school, `/notifications/${id}/read`), {
    method: "PATCH"
  });
}

export function markAllRead(school) {
  return apiFetch(schoolApiPath(school, `/notifications/mark-all-read`), {
    method: "POST"
  });
}
