// frontend/src/pages/dashboard/Dashboard.jsx
// ✅ 변경점: CourseHub 미리보기 카드에 listingType 뱃지 추가 (Wanted / For Sale)
// 나머지 로직/스타일/동작은 기존 그대로 유지
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
      className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* 모바일 1열 → md부터 사이드바 + 본문 (2열) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px,1fr]">
          {/* 사이드바: 모바일에서 위쪽에 표시 */}
          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:h-fit">
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

            {/* 모바일 2열, md부터 1열로 정돈 */}
            <nav className="mt-5 grid grid-cols-2 gap-2 text-sm md:grid-cols-1">
              <DashLink onClick={() => nav(schoolPath("/myposts"))}>My Posts</DashLink>
              <DashLink onClick={() => nav(schoolPath("/liked"))}>Liked</DashLink>
              <DashLink onClick={() => nav(schoolPath("/commented"))}>Commented</DashLink>
              <DashLink onClick={() => nav(schoolPath("/personal-schedule"))}>My Schedule</DashLink>
              <DashLink onClick={() => nav(schoolPath("/market"))}>Marketplace</DashLink>
              <DashLink onClick={() => nav(schoolPath("/foodmap"))}>Food Map</DashLink>
            </nav>
          </aside>

          {/* 본문 */}
          <main className="space-y-6">
            {/* Free Board */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2
                  onClick={() => nav(schoolPath("/freeboard"))}
                  className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
                  style={{ color: schoolTheme?.text || "#4c1d95" }}
                >
                  Free Board
                </h2>

                <button
                  onClick={() => ensureAuth(() => nav(schoolPath("/freeboard/write")))}
                  className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow sm:w-auto"
                  style={{ backgroundColor: schoolTheme?.primary || "#6b46c1" }}
                >
                  + Write Post
                </button>
              </div>

              {loadingPosts ? (
                <ul className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i}>
                      <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
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
                      <button
                        onClick={() => ensureAuth(() => nav(schoolPath(`/freeboard/${p._id}`)))}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <h3 className="min-w-0 truncate text-sm font-semibold text-gray-900 sm:text-base hover:underline">
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
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2
                  onClick={() => nav(schoolPath("/courses"))}
                  className="cursor-pointer text-lg font-semibold sm:text-xl hover:underline"
                  style={{ color: schoolTheme?.text || "#4c1d95" }}
                >
                  CourseHub
                </h2>

                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    onClick={() => ensureAuth(() => nav(schoolPath("/courses/write")))}
                    className="flex-1 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 sm:flex-none"
                  >
                    Upload note
                  </button>
                  <button
                    onClick={() => nav(schoolPath("/courses"))}
                    className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow sm:flex-none"
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
                <ul className="space-y-2">
                  {recent.map((m) => {
                    const id = m._id || m.id;
                    const code = (m.courseCode || m.course || "").toUpperCase();
                    const prof = m.professor || "Unknown";
                    const type = materialTypeLabel(m.materialType);
                    const isWanted = (m.listingType || "sale") === "wanted"; // ✅
                    return (
                      <li key={id} className="rounded-xl border p-3 hover:bg-gray-50">
                        <button
                          onClick={() => nav(schoolPath(`/courses/materials/${id}`))}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* ✅ ListingType 배지 */}
                              <span
                                className={
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                                  (isWanted
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-emerald-100 text-emerald-700")
                                }
                              >
                                {isWanted ? "Wanted" : "For Sale"}
                              </span>
                              <span className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                                {code || "UNKNOWN"}
                              </span>
                              <span className="truncate text-xs font-medium text-gray-700 sm:text-sm">
                                {prof}
                              </span>
                              <span className="truncate text-[11px] text-gray-500 sm:text-xs">
                                {type}
                              </span>
                            </div>
                          </div>
                          <span className="ml-3 shrink-0 text-xs text-gray-400">
                            {m.createdAt ? dayjs(m.createdAt).fromNow() : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Food CTA */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div
                onClick={() => nav(schoolPath("/foodmap"))}
                className="mb-2 cursor-pointer text-sm font-semibold text-gray-900 hover:underline"
              >
                🍱 Explore Nearby Food
              </div>
              <p className="text-xs text-gray-600">
                Discover top-rated restaurants and cafes near campus.
              </p>
              <div className="mt-3 h-48 w-full overflow-hidden rounded-lg bg-gray-100">
                <div className="h-full w-full animate-pulse" />
              </div>
            </section>
          </main>
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














