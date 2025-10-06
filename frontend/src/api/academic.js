// frontend/src/api/academic.js
import { getJson } from "./http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Try a URL and return null on failure (404/Network/HTML error)
async function tryGet(url) {
  try {
    return await getJson(url);
  } catch {
    return null;
  }
}

/**
 * Academic posts live in the same Post collection.
 * Primary (protected):  GET /:school/posts?board=academic
 * Fallback (public):    GET /public/:school/posts?board=academic
 */
export async function listAcademicPosts({
  school,
  mode,
  q = "",
  page = 1,
  limit = 20,
  sort = "recent",
} = {}) {
  // 1) Primary protected endpoint
  {
    const url = new URL(`${API}/${school}/posts`);
    url.searchParams.set("board", "academic");
    if (mode === "general" || mode === "looking_for") url.searchParams.set("mode", mode);
    if (q) url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sort", String(sort));
    const res = await tryGet(url);
    if (res) return res;
  }

  // 2) Public endpoint with board filter
  {
    const url = new URL(`${API}/public/${school}/posts`);
    url.searchParams.set("board", "academic");
    if (mode === "general" || mode === "looking_for") url.searchParams.set("mode", mode);
    if (q) url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sort", sort === "recent" ? "new" : String(sort));
    const res = await tryGet(url);
    if (res) return res;
  }

  // 3) Last-resort (avoid hard 404)
  {
    const url = new URL(`${API}/public/${school}/posts`);
    if (q) url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sort", sort === "recent" ? "new" : String(sort));
    const res = await tryGet(url);
    if (res) return res;
  }

  throw new Error("Academic list endpoint not available");
}

export async function getAcademicPost({ school, id }) {
  // 1) Primary protected detail
  {
    const url = `${API}/${school}/posts/${id}`;
    const res = await tryGet(url);
    if (res) return res;
  }
  // 2) Fallback public detail
  {
    const url = `${API}/public/${school}/posts/${id}`;
    const res = await tryGet(url);
    if (res) return res;
  }
  throw new Error("Academic detail endpoint not available");
}



