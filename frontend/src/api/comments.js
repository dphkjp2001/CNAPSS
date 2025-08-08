// src/api/comments.js
const BASE = import.meta.env.VITE_API_URL;

// 📌 댓글 불러오기
export const fetchComments = async (postId, type = "freeboard", viewerEmail = null) => {
  const query = viewerEmail ? `?type=${type}&email=${viewerEmail}` : `?type=${type}`;
  const res = await fetch(`${BASE}/comments/${postId}${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error("댓글 불러오기 실패");
  return data;
};

// 📌 댓글 작성 (일반 or 대댓글)
export const postComment = async ({ postId, email, content, parentId = null }) => {
  const res = await fetch(`${BASE}/comments/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, content, parentId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "댓글 등록 실패");
  return data;
};

// 📌 댓글 수정
export const updateComment = async ({ commentId, email, content }) => {
  const res = await fetch(`${BASE}/comments/${commentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "댓글 수정 실패");
  return data;
};

// 📌 댓글 삭제
export const deleteComment = async ({ commentId, email }) => {
  const res = await fetch(`${BASE}/comments/${commentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "댓글 삭제 실패");
  return data;
};

// 📌 댓글 좋아요 토글
export const toggleCommentLike = async ({ commentId, email }) => {
  const res = await fetch(`${BASE}/comments/${commentId}/thumb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "추천 실패");
  return data;
};
