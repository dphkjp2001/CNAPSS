// src/api/posts.js
const BASE = import.meta.env.VITE_API_URL;

// ------- helpers -------
async function http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
}

function withQS(url, params) {
  const qp = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null)
  );
  const qs = qp.toString();
  return qs ? `${url}?${qs}` : url;
}

// ------- Posts -------

// List (scoped)
export const fetchPosts = async (school) => {
  if (!school) throw new Error("school is required");
  return http("GET", withQS(`${BASE}/posts`, { school }));
};

// Detail (optional guard with school)
export const fetchPostById = async (id, school) => {
  if (!id) throw new Error("id is required");
  return http("GET", withQS(`${BASE}/posts/${id}`, { school }));
};

// Create (verified users) — school required
export const createPost = async ({ email, nickname, title, content, school }) => {
  if (!school) throw new Error("school is required");
  return http("POST", `${BASE}/posts`, { email, nickname, title, content, school });
};

// Update (author + school guard)
export const updatePost = async (id, { email, title, content, school }) => {
  if (!id) throw new Error("id is required");
  if (!school) throw new Error("school is required");
  return http("PUT", `${BASE}/posts/${id}`, { email, title, content, school });
};

// Delete (author + school guard)
export const deletePost = async (id, email, school) => {
  if (!id) throw new Error("id is required");
  if (!school) throw new Error("school is required");
  return http("DELETE", `${BASE}/posts/${id}`, { email, school });
};

// Toggle like (doc has school already)
export const togglePostLike = async (id, email) => {
  if (!id) throw new Error("id is required");
  return http("POST", `${BASE}/posts/${id}/thumbs`, { email });
};

// Dashboard helpers
export const fetchLikedPosts = async (email, school) => {
  if (!email) throw new Error("email is required");
  if (!school) throw new Error("school is required");
  return http("GET", withQS(`${BASE}/posts/liked/${email}`, { school }));
};

export const fetchCommentedPosts = async (email, school) => {
  if (!email) throw new Error("email is required");
  if (!school) throw new Error("school is required");
  return http("GET", withQS(`${BASE}/posts/commented/${email}`, { school }));
};
