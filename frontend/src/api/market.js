// frontend/src/api/market.js
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""); // e.g. https://api.cnapss.com/api

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// GET /api/:school/market
export async function listItems({ school, token, q, sort, page, limit } = {}) {
  const s = String(school || "").toLowerCase().trim();
  const url = new URL(`${API_URL}/${s}/market`);
  if (q) url.searchParams.set("q", q);
  if (sort) url.searchParams.set("sort", sort);
  if (page) url.searchParams.set("page", String(page));
  if (limit) url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load listings");
  return res.json();
}

// GET /api/:school/market/:id
export async function getItem({ school, token, id }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/market/${id}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load item");
  return res.json();
}

// POST /api/:school/market
export async function createItem({ school, token, payload }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/market`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create item");
  return res.json();
}

// PUT /api/:school/market/:id
export async function updateItem({ school, token, id, payload }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/market/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

// DELETE /api/:school/market/:id
export async function deleteItem({ school, token, id }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/market/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete item");
  return res.json();
}

/** ===== Requests (문의) ===== **/

// GET /api/:school/market/request/:itemId/:email
export async function checkRequest({ school, token, itemId, email }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(
    `${API_URL}/${s}/market/request/${encodeURIComponent(itemId)}/${encodeURIComponent(email)}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to check request");
  return res.json(); // { alreadySent: boolean }
}

// POST /api/:school/market/request  { itemId, buyer, message }
export async function sendRequest({ school, token, itemId, buyer, message }) {
  const s = String(school || "").toLowerCase().trim();
  const res = await fetch(`${API_URL}/${s}/market/request`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ itemId, buyer, message }),
  });
  if (res.status === 409) {
    // 이미 요청 보낸 경우(백엔드가 409로 주는 케이스)
    const data = await res.json().catch(() => ({}));
    return { alreadySent: true, ...data };
  }
  if (!res.ok) throw new Error("Failed to send request");
  return res.json(); // { conversationId, ... }
}

