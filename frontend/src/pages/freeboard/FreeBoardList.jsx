/// src/pages/freeboard/FreeBoardList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import { fetchPosts } from "../../api/posts";

dayjs.extend(relativeTime);
dayjs.locale("en");

const PAGE_SIZE = 10;

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
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new"); // "new" | "old"
  const [page, setPage] = useState(1);

  // ✅ school 스코프 반영해서 불러오기
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchPosts(school); // ← 서버에 ?school=NYU 로 요청
        if (alive) setPosts(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setError("Failed to load posts.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [school]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = posts.filter((p) =>
      q ? p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) : true
    );
    list = list.sort((a, b) =>
      sort === "old"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );
    return list;
  }, [posts, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Top bar */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Free Board</h2>

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

            {user && (
              <button
                onClick={() => navigate(schoolPath("/freeboard/write"))}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
              >
                + Write Post
              </button>
            )}
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
        ) : filtered.length === 0 ? (
          <EmptyState
            onWrite={() => navigate(schoolPath("/freeboard/write"))}
            primary={schoolTheme?.primary || "#6b46c1"}
          />
        ) : (
          <>
            <ul className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              {paged.map((post, idx) => (
                <li key={post._id} className="px-4 py-4 sm:px-6">
                  <Link to={schoolPath(`/freeboard/${post._id}`)} className="block">
                    <h3 className="line-clamp-2 text-base font-semibold text-gray-900 hover:underline">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Posted by anonymous • {dayjs(post.createdAt).fromNow()}
                    </p>
                  </Link>
                  {idx !== paged.length - 1 && <div className="mt-4 h-px w-full bg-gray-100" />}
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}









