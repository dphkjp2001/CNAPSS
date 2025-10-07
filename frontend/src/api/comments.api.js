import { apiFetch } from "./http";
import { schoolApiPath } from "../utils/schoolPath";

export function listComments(school, postId) {
  return apiFetch(schoolApiPath(school, `/posts/${postId}/comments`));
}

export function createComment(school, postId, payload) {
  return apiFetch(schoolApiPath(school, `/posts/${postId}/comments`), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function voteComment(school, commentId, value) {
  return apiFetch(schoolApiPath(school, `/comments/${commentId}/vote`), {
    method: "POST",
    body: JSON.stringify({ value })
  });
}

export function deleteComment(school, commentId) {
  return apiFetch(schoolApiPath(school, `/comments/${commentId}`), {
    method: "DELETE"
  });
}
