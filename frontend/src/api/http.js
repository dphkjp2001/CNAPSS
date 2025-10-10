// frontend/src/api/http.js
// 공통 fetch 래퍼 (컨텍스트 의존 X)

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ✅ 토큰 키 후보 확장
const TOKEN_KEYS = [
  "token",
  "jwt",
  "accessToken",
  "authToken",
  "CNAPSS_TOKEN",
  "CNAPSS_AUTH",
];

function readToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function clearToken() {
  for (const k of TOKEN_KEYS) {
    try { localStorage.removeItem(k); } catch {}
    try { sessionStorage.removeItem(k); } catch {}
  }
}

function notifyExpired() {
  try {
    window.dispatchEvent(new CustomEvent("CNAPSS_TOKEN_EXPIRED"));
  } catch {}
}

async function request(url, options = {}) {
  const token = readToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers, credentials: "include" });

  if (res.status === 401) {
    let body = {};
    try { body = await res.clone().json(); } catch {}
    const expired = res.headers.get("x-token-expired") === "1" || body?.code === "TOKEN_EXPIRED";
    if (expired) {
      clearToken();
      notifyExpired();
      throw new Error("TOKEN_EXPIRED");
    }
  }

  const data = await (async () => {
    const ct = res.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  })();

  if (!res.ok) {
    const msg = typeof data === "object" && data?.message ? data.message : String(data);
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function getJson(url) {
  const full = url.toString().startsWith("http") ? url : `${API_URL}${url}`;
  return request(full, { method: "GET" });
}
export function postJson(url, body) {
  const full = url.toString().startsWith("http") ? url : `${API_URL}${url}`;
  const opts = { method: "POST" };
  if (body instanceof FormData) opts.body = body;
  else opts.body = JSON.stringify(body || {});
  return request(full, opts);
}
export function putJson(url, body) {
  const full = url.toString().startsWith("http") ? url : `${API_URL}${url}`;
  const opts = { method: "PUT" };
  if (body instanceof FormData) opts.body = body;
  else opts.body = JSON.stringify(body || {});
  return request(full, opts);
}
export function deleteJson(url) {
  const full = url.toString().startsWith("http") ? url : `${API_URL}${url}`;
  return request(full, { method: "DELETE" });
}

export function apiFetch(pathOrUrl, options = {}) {
  const { method = "GET", body = null, headers = {}, useApiBase = true } = options;
  const isAbsolute = typeof pathOrUrl === "string" && /^https?:\/\//i.test(pathOrUrl);
  const full = isAbsolute || useApiBase === false ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  let finalOptions = { method, headers };
  if (body instanceof FormData) finalOptions.body = body;
  else if (body != null) finalOptions.body = JSON.stringify(body);
  return request(full, finalOptions);
}


