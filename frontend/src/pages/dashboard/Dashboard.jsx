// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { useLoginGate } from "../../hooks/useLoginGate";

import { listPosts, getPublicPosts } from "../../api/posts";
// ⛔️ Removed: import CourseHubPreview from "./CourseHubPreview";

dayjs.extend(relativeTime);
dayjs.locale("en");

const avatarBg = (hex) => ({
  background: hex || "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.12))",
});

export default function Dashboard() {
  const { user, token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const { ensureAuth } = useLoginGate();
  const nav = useNavigate();
  const schoolPath = useSchoolPath();

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState("");

  useEffect(() => {
    let alive = true;
    if (!school) return;

    (async () => {
      setLoadingPosts(true);
      setErrorPosts("");
      try {
        let data;
        if (token) data = await listPosts({ school, token });
        else data = await getPublicPosts({ school, page: 1, limit: 10 });

        const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (alive) setPosts(rows.slice(0, 5));
      } catch {
        if (alive) setErrorPosts("Failed to load posts.");
      } finally {
        if (alive) setLoadingPosts(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [school, token]);

  const initials = useMemo(() => {
    const nm = user?.nickname || (user?.email ? user.email.split("@")[0] : "Guest");
    return nm.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left: Profile */}
          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div
                className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-gray-900"
                style={avatarBg(schoolTheme?.bg)}
              >
                {initials}
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {user?.nickname || "Guest"}
                </div>
                <div className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">
                  {school?.toUpperCase() || "SCHOOL"}
                </div>
              </div>

              <nav className="mt-6 space-y-2 text-sm">
                <DashLink onClick={() => nav(schoolPath("/myposts"))}>My Posts</DashLink>
                <DashLink onClick={() => nav(schoolPath("/liked"))}>Liked</DashLink>
                <DashLink onClick={() => nav(schoolPath("/commented"))}>Commented</DashLink>
                <DashLink onClick={() => nav(schoolPath("/personal-schedule"))}>
                  Schedule
                </DashLink>
                <DashLink onClick={() => nav(schoolPath("/market"))}>Marketplace</DashLink>
                <DashLink onClick={() => nav(schoolPath("/foodmap"))}>Food Map</DashLink>
              </nav>
            </div>
          </aside>

          {/* Center: Main */}
          <main className="lg:col-span-6">
            {/* Free Board (titles only) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  onClick={() => nav(schoolPath("/freeboard"))}
                  className="cursor-pointer text-2xl font-extrabold hover:underline"
                  style={{ color: schoolTheme?.text || "#4c1d95" }}
                >
                  Free Board
                </h2>
              </div>

              {loadingPosts ? (
                <ul className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i}>
                      <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
                      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                    </li>
                  ))}
                </ul>
              ) : errorPosts ? (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorPosts}</div>
              ) : posts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
                  No posts yet. Be the first to write!
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {posts.map((p) => (
                    <li key={p._id} className="py-4">
                      <button
                        onClick={() => ensureAuth(() => nav(schoolPath(`/freeboard/${p._id}`)))}
                        className="block w-full text-left"
                      >
                        <h3 className="line-clamp-1 text-base font-semibold text-gray-900 hover:underline">
                          {p.title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">{dayjs(p.createdAt).fromNow()}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 text-right">
                <button
                  onClick={() => ensureAuth(() => nav(schoolPath("/freeboard/write")))}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                >
                  + Write Post
                </button>
              </div>
            </section>

            {/* CourseHub (no preview — CTA only) */}
            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  onClick={() => nav(schoolPath("/courses"))}
                  className="cursor-pointer text-2xl font-extrabold hover:underline"
                  style={{ color: schoolTheme?.text || "#4c1d95" }}
                >
                  CourseHub
                </h2>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => ensureAuth(() => nav(schoolPath("/courses/write")))}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Upload note
                </button>
                <button
                  onClick={() => nav(schoolPath("/courses"))}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                >
                  Open Course Hub
                </button>
              </div>
            </section>
          </main>

          {/* Right: Side widgets */}
          <aside className="space-y-5 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3
                onClick={() => nav(schoolPath("/courses"))}
                className="mb-3 cursor-pointer text-lg font-bold text-gray-900 hover:underline"
              >
                Course Hub
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => nav(schoolPath("/courses/write"))}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm hover:bg-gray-50"
                >
                  Upload note
                </button>
                <button
                  onClick={() => nav(schoolPath("/courses"))}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                >
                  Open Course Hub
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div
                onClick={() => nav(schoolPath("/foodmap"))}
                className="mb-2 cursor-pointer text-sm font-semibold text-gray-900 hover:underline"
              >
                🍱 Explore Nearby Food
              </div>
              <p className="text-xs text-gray-600">
                Discover top-rated restaurants and cafes near campus.
              </p>
              <div className="mt-3 h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                <div className="h-full w-full animate-pulse" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DashLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-gray-700 hover:border-gray-200 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}









