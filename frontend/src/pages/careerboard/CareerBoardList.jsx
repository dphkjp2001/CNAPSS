// frontend/src/pages/careerboard/CareerBoardList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { useLoginGate } from "../../hooks/useLoginGate";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { listCareerPosts, getPublicCareerPosts } from "../../api/careerPosts";
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

/** ⬇️ 담백 버전: 아이콘/중앙 버튼 제거, 안내 문구만 */
function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
      <p className="text-sm text-gray-500">No posts yet.</p>
    </div>
  );
}

export default function CareerBoardList() {
  const { token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();
  const { ensureAuth } = useLoginGate();

  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const query = sp.get("q") || "";
  const sort = sp.get("sort") || "new";

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

  useEffect(() => {
    let alive = true;
    if (!school) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        let res;
        if (token) {
          res = await listCareerPosts({ school, page, limit: PAGE_SIZE, q: query, sort });
        } else {
          res = await getPublicCareerPosts({ school, page, limit: PAGE_SIZE, q: query, sort });
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
            Career Board
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
              onClick={() => navigate(schoolPath("/career/write"))}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              style={primaryBtn}
            >
              + Write
            </button>
          </div>
        </div>

        {/* List */}
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            {loading ? (
                <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                </>
            ) : error ? (
                <li className="p-4 text-sm text-red-700">{error}</li>
            ) : items.length === 0 ? (
                <li className="p-4">
                <EmptyState />
                </li>
            ) : (
                items.map((it) => (
                <li key={it._id} className="py-3">
                    <button
                    onClick={() => navigate(schoolPath(`/career/${it._id}`))}
                    className="w-full text-left"
                    >
                    <div className="text-base font-medium text-gray-900">{it.title}</div>
                    <div className="mt-1 text-xs text-gray-500">
                        Posted by anonymous • {dayjs(it.createdAt).fromNow()} · 💬 {it.commentsCount ?? "-"} · 👍 {it.likesCount ?? "-"}
                    </div>
                    </button>
                </li>
                ))
            )}
        </ul>

        {/* Pagination */}
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

