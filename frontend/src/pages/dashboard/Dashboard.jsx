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
import { listRecentMaterials } from "../../api/materials";

dayjs.extend(relativeTime);
dayjs.locale("en");

const avatarBg = (hex) => ({
  background:
    hex || "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.12))",
});

const materialTypeLabel = (t) => {
  switch (t) {
    case "personalMaterial":
      return "personal material";
    case "personalClassNote":
      return "personal class note";
    default:
      return t || "material";
  }
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const { school, schoolTheme } = useSchool();
  const { ensureAuth } = useLoginGate();
  const nav = useNavigate();
  const schoolPath = useSchoolPath();

  // ===== Free Board =====
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

  // ===== CourseHub 최근 5개 =====
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [errorRecent, setErrorRecent] = useState("");

  useEffect(() => {
    let alive = true;
    if (!school) return;
    (async () => {
      setLoadingRecent(true);
      setErrorRecent("");
      try {
        const res = await listRecentMaterials({ school, token, limit: 5 });
        const rows = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (alive) setRecent(rows);
      } catch {
        if (alive) setErrorRecent("Failed to load CourseHub items.");
      } finally {
        if (alive) setLoadingRecent(false);
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
        {/* 좌 2 / 중 7 / 우 3 로 비중 재조정 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left: Profile (조금 작게) */}
          <aside className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div
                className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-gray-900"
                style={avatarBg(schoolTheme?.bg)}
              >
                {initials}
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-gray-900">
                  {user?.nickname || "Guest"}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">
                  {school?.toUpperCase() || "SCHOOL"}
                </div>
              </div>

              <nav className="mt-5 space-y-1.5 text-sm">
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

          {/* Center: Main (조금 넓게) */}
          <main className="lg:col-span-7">
            {/* Free Board */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  onClick={() => nav(schoolPath("/freeboard"))}
                  className="cursor-pointer text-2xl font-extrabold hover:underline"
                  style={{ color: schoolTheme?.text || "#4c1d95" }}
                >
                  Free Board
                </h2>

                {/* 버튼 상단 오른쪽 */}
                <button
                  onClick={() => ensureAuth(() => nav(schoolPath("/freeboard/write")))}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                >
                  + Write Post
                </button>
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
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {errorPosts}
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
                  No posts yet. Be the first to write!
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {posts.map((p) => (
                    <li key={p._id} className="py-3">
                      {/* 제목 왼쪽(조금 더 큼) / 시간 오른쪽 */}
                      <button
                        onClick={() =>
                          ensureAuth(() => nav(schoolPath(`/freeboard/${p._id}`)))
                        }
                        className="flex w-full items-center justify-between text-left"
                      >
                        {/* 여기 폰트를 CourseHub 코드와 동일하게 text-base */}
                        <h3 className="min-w-0 truncate text-base font-semibold text-gray-900 hover:underline">
                          {p.title}
                        </h3>
                        <span className="ml-3 shrink-0 text-xs text-gray-500">
                          {dayjs(p.createdAt).fromNow()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* CourseHub preview (최근 5개) */}
            <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  onClick={() => nav(schoolPath("/courses"))}
                  className="cursor-pointer text-2xl font-extrabold hover:underline"
                  style={{ color: schoolTheme?.text || "#4c1d95" }}
                >
                  CourseHub
                </h2>

                <div className="flex gap-2">
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
              </div>

              {loadingRecent ? (
                <ul className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                    </li>
                  ))}
                </ul>
              ) : errorRecent ? (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {errorRecent}
                </div>
              ) : recent.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
                  No postings yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recent.map((m) => {
                    const id = m._id || m.id;
                    const code = (m.courseCode || m.course || "").toUpperCase();
                    const prof = m.professor || "Unknown";
                    const type = materialTypeLabel(m.materialType);

                    return (
                      <li key={id} className="py-3">
                        <button
                          onClick={() => nav(schoolPath(`/courses/materials/${id}`))}
                          className="flex w-full items-center justify-between text-left"
                        >
                          {/* 코드/교수/타입 사이 간격 살짝 ↑ : gap-x-3 -> gap-x-4 */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-12 gap-y-1">
                              <span className="truncate text-base font-semibold text-gray-900">
                                {code || "UNKNOWN"}
                              </span>
                              <span className="truncate text-sm font-medium text-gray-700">
                                {prof}
                              </span>
                              <span className="truncate text-xs text-gray-500">{type}</span>
                            </div>
                          </div>
                          <span className="ml-3 shrink-0 text-xs text-gray-500">
                            {m.createdAt ? dayjs(m.createdAt).fromNow() : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </main>

          {/* Right: Side (우측 상단 CourseHub 제거, FoodMap만 길쭉하게) */}
          <aside className="space-y-5 lg:col-span-3">
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
              {/* 세로 길게: h-28 -> h-48 */}
              <div className="mt-3 h-48 w-full overflow-hidden rounded-lg bg-gray-100">
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












