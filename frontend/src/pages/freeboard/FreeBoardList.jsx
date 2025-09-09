/// frontend/src/pages/freeboard/FreeBoardList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { useLoginGate } from "../../hooks/useLoginGate";
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

function EmptyState({ onWrite, primary }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
        📝
      </div>
      <h3 className="text-lg font-semibold text-gray-800">No posts yet</h3>
      <p className="mt-1 text-sm text-gray-500">Be the first to start a discussion.</p>
      <button
        onClick={onWrite}
        className="mt-6 inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-0"
        style={{ backgroundColor: primary }}
      >
        + Write Post
      </button>
    </div>
  );
}

export default function FreeBoardList() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const { ensureAuth } = useLoginGate();

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

  // Load list (server-side pagination; public/protected both 지원)
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

        // normalize
        let rows = [];
        let tot = 0;
        if (res && typeof res === "object" && Array.isArray(res.items)) {
          rows = res.items;
          tot = Number(res.total || 0);
        } else if (Array.isArray(res)) {
          // fallback for old API
          const q = (query || "").trim().toLowerCase();
          rows = res.filter((p) =>
            q ? p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) : true
          );
          rows = rows.sort((a, b) =>
            sort === "old"
              ? new Date(a.createdAt) - new Date(b.createdAt)
              : new Date(b.createdAt) - new Date(a.createdAt)
          );
          tot = rows.length;
          const start = (page - 1) * PAGE_SIZE;
          rows = rows.slice(start, start + PAGE_SIZE);
        }

        if (!alive) return;
        setItems(rows);
        setTotal(tot);
      } catch (e) {
        if (alive) setError("Failed to load posts.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [school, token, page, query, sort]);

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

            <button
              onClick={() => ensureAuth(() => navigate(schoolPath("/freeboard/write")))}
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
          <EmptyState
            onWrite={() => ensureAuth(() => navigate(schoolPath("/freeboard/write")))}
            primary={schoolTheme?.primary || "#6b46c1"}
          />
        ) : (
          <>
            <ul className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              {items.map((post, idx) => (
                <li key={post._id} className="px-4 py-4 sm:px-6">
                  <button
                    onClick={() =>
                      ensureAuth(() => navigate(schoolPath(`/freeboard/${post._id}`)))
                    }
                    className="block w-full text-left"
                  >
                    <h3 className="line-clamp-2 text-base font-semibold text-gray-900 hover:underline">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Posted by anonymous • {dayjs(post.createdAt).fromNow()}
                    </p>
                  </button>
                  {idx !== items.length - 1 && <div className="mt-4 h-px w-full bg-gray-100" />}
                </li>
              ))}
            </ul>

            {/* ✅ 항상 페이지네이션 표시(아이템만 있으면) — 1페이지만 있어도 보여줌 */}
            <Pagination
              page={page}
              total={Math.max(total, items.length)}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              siblingCount={1}
              boundaryCount={1}
              className="mb-2"
              showStatus
            />
          </>
        )}
      </div>
    </div>
  );
}













