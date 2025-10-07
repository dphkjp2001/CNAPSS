import { apiFetch } from "./http";
import { schoolApiPath } from "../utils/schoolPath";

export function createRequest(school, { postId, message }) {
  return apiFetch(schoolApiPath(school, "/requests"), {
    method: "POST",
    body: JSON.stringify({ postId, message })
  });
}

export function listRequests(school, mine) {
  const qs = mine ? `?mine=${encodeURIComponent(mine)}` : "";
  return apiFetch(schoolApiPath(school, `/requests${qs}`));
}

export function updateRequest(school, id, action) {
  return apiFetch(schoolApiPath(school, `/requests/${id}`), {
    method: "PATCH",
    body: JSON.stringify({ action })
  });
}
