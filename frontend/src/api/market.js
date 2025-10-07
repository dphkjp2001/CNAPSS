// frontend/src/api/market.js
import { apiFetch } from "./http";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/* ------------------------- Public (no auth) ------------------------- */
export async function getPublicMarketRecent({ school, limit = 5 } = {}) {
  if (!school) throw new Error("school is required");
  const url = `${API}/public/${encodeURIComponent(school)}/market/recent?limit=${limit}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("failed to load public recent");
  return res.json(); // { items: [...] }
}

export async function getPublicMarketList({
  school,
  page = 1,
  pageSize = 20,
  q = "",
  sort = "new", // new | price-asc | price-desc
} = {}) {
  if (!school) throw new Error("school is required");
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  if (q) qs.set("q", q);
  if (sort) qs.set("sort", sort);
  const url = `${API}/public/${encodeURIComponent(school)}/market?${qs.toString()}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("failed to load public list");
  return res.json(); // { items, total, page, pageSize, totalPages }
}

export async function getPublicMarketItem({ school, id }) {
  if (!school) throw new Error("school is required");
  if (!id) throw new Error("id is required");
  const url = `${API}/public/${encodeURIComponent(school)}/market/${encodeURIComponent(id)}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("failed to load public item");
  return res.json(); // { id, title, description, price, images, status, sellerNickname, ... }
}

/* ------------------------ Protected (auth) -------------------------- */
/** ------------------------------------------------------------------
 * 리스트 조회 (이전/현재 호출 방식 모두 지원)
 *   1) listItems({ school, token, page, limit, q, mine, sold, cursor })
 *   2) listItems(school, { token, page, limit, q, mine, sold, cursor })
 * ------------------------------------------------------------------*/
export async function listItems(arg1, arg2 = {}) {
  let school, opts;
  if (typeof arg1 === "string") {
    school = arg1;
    opts = arg2 || {};
  } else {
    const { school: s, ...rest } = arg1 || {};
    school = s; // fixed stray character
    opts = rest;
  }
  if (!school) throw new Error("school is required");

  const {
    token,
    page,
    limit,
    q,
    mine,
    sold,
    cursor,
    ...rest
  } = opts;

  const qs = new URLSearchParams();
  if (page != null) qs.set("page", String(page));
  if (limit != null) qs.set("limit", String(limit));
  if (q) qs.set("q", String(q));
  if (mine != null) qs.set("mine", mine ? "1" : "0");
  if (sold != null) qs.set("sold", sold ? "1" : "0");
  if (cursor) qs.set("cursor", String(cursor));
  Object.entries(rest).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });

  const url =
    `${API}/${encodeURIComponent(school)}/market` +
    (qs.toString() ? `?${qs.toString()}` : "");

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await apiFetch(url, { headers });
  if (!res.ok) throw new Error("failed to load list");
  return res.json();
}

/** 단일 아이템 조회 */
export async function getItem({ school, token, id }) {
  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/market/${encodeURIComponent(id)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("failed to load item");
  return res.json();
}

/** 아이템 생성 (payload pass-through)
 * 지원 형태:
 *   createItem({ school, token, data })
 *   createItem({ school, token, payload })   // alias supported
 *   createItem(school, data, token?)
 */
export async function createItem(a1, a2, a3) {
  let school, data, token;
  if (typeof a1 === "string") {
    school = a1;
    data = a2 || {};
    token = a3;
  } else {
    const { school: s, token: t, data: d, payload: p, ...rest } = a1 || {};
    school = s;
    token = t;
    // accept both data and payload; fall back to spread
    data = d ?? p ?? rest;
  }
  if (!school) throw new Error("school is required");

  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/market`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data || {}),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "failed to create");
  return body; // { id, ... }
}

/** 아이템 수정 (payload pass-through)
 *   updateItem({ school, token, id, data })
 *   updateItem({ school, token, id, payload })  // alias supported
 *   updateItem(school, id, data, token?)
 */
export async function updateItem(a1, a2, a3, a4) {
  let school, id, data, token;
  if (typeof a1 === "string") {
    school = a1;
    id = a2;
    data = a3 || {};
    token = a4;
  } else {
    // ✅ support both `data` and `payload`
    const { school: s, id: i, token: t, data: d, payload: p, ...rest } = a1 || {};
    school = s;
    id = i;
    token = t;
    data = d ?? p ?? rest;
  }
  if (!school || !id) throw new Error("school and id are required");

  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/market/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data || {}),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "failed to update");
  return body;
}

/** 아이템 삭제 */
export async function deleteItem({ school, token, id }) {
  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/market/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error("failed to delete");
  return true;
}

/** 이미 보낸 요청인지 확인 (마켓/코스헙 통합 라우트) */
export async function checkRequest({ school, token, itemId }) {
  const qs = new URLSearchParams({ type: "market", targetId: itemId }).toString();
  const res = await apiFetch(
    `${API}/${encodeURIComponent(school)}/request/status?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return { alreadySent: false };
  return res.json(); // { alreadySent, conversationId? }
}

/** 요청 보내기 (마켓/코스헙 통합 라우트) */
export async function sendRequest({ school, token, itemId, message }) {
  const res = await apiFetch(`${API}/${encodeURIComponent(school)}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: "market",
      targetId: itemId,
      message: String(message || "").trim(),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 201 || res.status === 200) return data;
  if (res.status === 409) return { alreadySent: true, ...data };
  throw new Error(data?.error || "request failed");
}






