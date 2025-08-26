// frontend/src/api/posts.js

// e.g. VITE_API_URL = "https://api.cnapss.com/api"
// ensure no trailing slash
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/* ===================== Public (no auth) ===================== */
/**
 * GET /api/public/:school/posts
 * Query: page, limit, q, sort(new|old)
 * Response: { page, limit, total, items: [{ _id, title, createdAt, commentsCount, likesCount }] }
 */
export async function getPublicPosts({ school, page = 1, limit = 20, q = "", sort = "new" }) {
  const url = new URL(`${API_URL}/public/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load public posts");
  return res.json(); // { page, limit, total, items: [...] }
}

/* ===================== Protected (auth) ===================== */
// List (protected)
export async function listPosts({ school, token, page, limit } = {}) {
  const url = new URL(`${API_URL}/${school}/posts`);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load posts");
  return res.json(); // usually an array
}

// Detail (protected)
export async function getPost({ school, token, id }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load post");
  return res.json();
}

// Create (protected)
export async function createPost({ school, token, title, content }) {
  const res = await fetch(`${API_URL}/${school}/posts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

// Update (protected)
export async function updatePost({ school, token, id, title, content }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

// Delete (protected)
export async function deletePost({ school, token, id }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete post");
  return res.json();
}

// Toggle like (protected)
export async function toggleThumbs({ school, token, id }) {
  const res = await fetch(`${API_URL}/${school}/posts/${id}/thumbs`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to toggle like");
  return res.json();
}

// Liked by me (protected)
export async function listLiked({ school, token, email }) {
  const res = await fetch(`${API_URL}/${school}/posts/liked/${encodeURIComponent(email)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load liked posts");
  return res.json();
}

// Commented by me (protected)
export async function listCommented({ school, token, email }) {
  const res = await fetch(`${API_URL}/${school}/posts/commented/${encodeURIComponent(email)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load commented posts");
  return res.json();
}

/* ===== Backward-compat ADAPTERS (keep old imports working) =====
   Old usages:
   - fetchPosts(school)
   - fetchPostById(id, school)
   - togglePostLike(id, school)
   - fetchLikedPosts(email, school)
   - fetchCommentedPosts(email, school)
   These adapters pull token from localStorage so old pages don't need to pass it explicitly.
*/
const tokenFromStorage = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return "";
  }
};

export async function fetchPosts(school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return listPosts({ school, token });
}

export async function fetchPost(id, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return getPost({ school, token, id });
}

export async function fetchPostById(id, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return getPost({ school, token, id });
}

export async function togglePostLike(id, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return toggleThumbs({ school, token, id });
}

export async function fetchLikedPosts(email, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return listLiked({ school, token, email });
}

export async function fetchCommentedPosts(email, school, opts = {}) {
  const token = opts.token || tokenFromStorage();
  return listCommented({ school, token, email });
}
// ================================================================

