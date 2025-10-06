// frontend/src/api/academic.js
import { getJson } from "./http";
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function tryGet(url) {
  try { return await getJson(url); } catch { return null; }
}

// list with protected -> public fallback
export async function listAcademicPosts({ school, q = "", page = 1, limit = 20, sort = "recent", mode } = {}) {
  // 1) protected
  {
    const u = new URL(`${API}/${school}/posts`);
    u.searchParams.set("board", "academic");
    if (mode === "general" || mode === "looking_for") u.searchParams.set("mode", mode);
    if (q) u.searchParams.set("q", q);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort", String(sort));
    const r = await tryGet(u);
    if (r) return r;
  }
  // 2) public
  {
    const u = new URL(`${API}/public/${school}/posts`);
    u.searchParams.set("board", "academic");
    if (mode === "general" || mode === "looking_for") u.searchParams.set("mode", mode);
    if (q) u.searchParams.set("q", q);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort", sort === "recent" ? "new" : String(sort));
    const r = await tryGet(u);
    if (r) return r;
  }
  throw new Error("Academic list endpoint not available");
}

export async function getAcademicPost({ school, id }) {
  {
    const r = await tryGet(`${API}/${school}/posts/${id}`);
    if (r) return r;
  }
  {
    const r = await tryGet(`${API}/public/${school}/posts/${id}`);
    if (r) return r;
  }
  throw new Error("Academic detail endpoint not available");
}




