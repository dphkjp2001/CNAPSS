// frontend/src/pages/freeboard/FreeBoardList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
// import { useLoginGate } from "../../hooks/useLoginGate"; // ❌ 진입 게이트 제거로 미사용
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { listPosts, getPublicPosts } from "../../api/posts";
import Pagination from "../../components/Pagination";

dayjs.extend(relativeTime);
dayjs.locale("en");

const PAGE_SIZE = 20;

function SkeletonRow() {
  return (
    <li className="animate-pulse">
      <div className="h-5 w-2/3 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
      <div className="mt-3 h-px w-full bg-gray-100" />
    </li>
  );
}

/** Minimal empty state */
function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
      <p className="text-sm text-gray-500">No posts yet.</p>
    </div>
  );
}

export default function FreeBoardList() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  // const { ensureAuth } = useLoginGate(); // ❌ 진입 게이트 제거로 미사용

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const query = sp.get("q") || "";
  const sort = sp.get("sort") || "new"; // "new" | "old"

  const setPage = (p) => {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(p));
    setSp(next, { replace: true });
  };
  const setQuery = (q) => {
    const next = new URLSearchParams(sp.toString());
    q ? next.set("q", q) : next.delete("q");
    next.set("page", "1");
    setSp(next, { replace: true });
  };
  const setSort = (s) => {
    const next = new URLSearchParams(sp.toString());
    next.set("sort", s);
    next.set("page", "1");
    setSp(next, { replace: true });
  };

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load list (server-side pagination; public/protected both)
  useEffect(() => {
    let alive = true;
    if (!school) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        let res;
        if (token) {
          res = await listPosts({ school, page, limit: PAGE_SIZE, q: query, sort });
        } else {
          res = await getPublicPosts({ school, page, limit: PAGE_SIZE, q: query, sort });
        }

        const nextItems = res?.items || res || [];
        if (!alive) return;
        setItems(nextItems);
        setTotal(Number(res?.total ?? nextItems.length ?? 0));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load posts.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, school, page, query, sort]);

  const headerColor = { color: schoolTheme?.text || "#111827" };
  const primaryBtn = { backgroundColor: schoolTheme?.primary || "#111827" };

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Top bar */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold tracking-tight" style={headerColor}>
            Free Board
          </h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative sm:w-80">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                aria-label="search posts"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              aria-label="sort posts"
            >
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
            </select>

            {/* ✅ 페이지 진입은 모두 허용: 게이트 제거, 그냥 이동 */}
            <button
              onClick={() => navigate(schoolPath("/freeboard/write"))}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={primaryBtn}
            >
              + Write Post
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <ul className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </ul>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {items.map((post, idx) => (
              <li key={post._id} className="px-4 py-4 sm:px-6">
                <button
                  onClick={() => navigate(schoolPath(`/freeboard/${post._id}`))}
                  className="block w-full text-left"
                >
                  <h3 className="line-clamp-2 text-base font-semibold text-gray-900 hover:underline">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Posted by anonymous • {dayjs(post.createdAt).fromNow()} · 💬{" "}
                    {post.commentsCount ?? "-"} · 👍 {post.likesCount ?? "-"}
                  </p>
                </button>
                {idx !== items.length - 1 && <div className="mt-4 h-px w-full bg-gray-100" />}
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          total={total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
          className="mb-8"
        />
      </div>
    </div>
  );
}


