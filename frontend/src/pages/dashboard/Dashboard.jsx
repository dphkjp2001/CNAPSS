// src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { listPosts, getPublicPosts } from "../../api/posts";
import { useLoginGate } from "../../hooks/useLoginGate";
import CourseHubPreview from "./CourseHubPreview";

// Mini map preview (Leaflet)
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
dayjs.extend(relativeTime);
dayjs.locale("en");

const PREVIEW_COUNT = 5;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { school, schoolTheme, loading } = useSchool();
  const schoolPath = useSchoolPath();
  const { ensureAuth } = useLoginGate();

  const [latestPosts, setLatestPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Center for mini map (NYU fallback)
  const SCHOOL_CENTER = useMemo(() => ({ lat: 40.7291, lon: -73.9965 }), []);

  if (loading) return null;
  if (!school) return <Navigate to="/select-school" replace />;

  // Load Free Board preview
  useEffect(() => {
    let alive = true;
    if (!school) return;

    (async () => {
      setLoadingPosts(true);
      try {
        let rows = [];
        if (token) {
          const data = await listPosts({ school, token, page: 1, limit: PREVIEW_COUNT });
          rows = Array.isArray(data) ? data.slice(0, PREVIEW_COUNT) : [];
        } else {
          const pub = await getPublicPosts({ school, page: 1, limit: PREVIEW_COUNT, sort: "new" });
          rows = Array.isArray(pub?.items) ? pub.items.slice(0, PREVIEW_COUNT) : [];
        }
        if (alive) setLatestPosts(rows);
      } catch {
        if (alive) setLatestPosts([]);
      } finally {
        if (alive) setLoadingPosts(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [school, token]);

  const bg = schoolTheme?.bg || "#f6f3ff";
  const primary = schoolTheme?.primary || "#6b46c1";
  const textColor = schoolTheme?.text || "#111827";

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg }}>
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-6 py-12 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 rounded-2xl border border-sand bg-white/80 p-6 shadow-md backdrop-blur-md lg:w-72">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full" style={{ backgroundColor: primary }} />
            <p className="mt-4 text-xl font-bold" style={{ color: textColor }}>
              {user?.nickname || school.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">{school.toUpperCase()}</p>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li>
              <Link to={schoolPath("/myposts")} className="transition hover:text-indigo-600">
                My Posts
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/liked")} className="transition hover:text-indigo-600">
                Liked
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/commented")} className="transition hover:text-indigo-600">
                Commented
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/personal-schedule")} className="transition hover:text-indigo-600">
                Schedule
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/market")} className="transition hover:text-indigo-600">
                Marketplace
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/foodmap")} className="transition hover:text-indigo-600">
                Food Map
              </Link>
            </li>
          </ul>
        </aside>

        {/* Main area */}
        <main className="flex w-full flex-1 flex-col">
          {/* Top row: Free Board (8) + Course Hub (4) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Free Board Preview */}
            <section className="lg:col-span-8 rounded-2xl border border-sand bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <Link to={schoolPath("/freeboard")}>
                  <h2 className="cursor-pointer text-2xl font-bold hover:underline" style={{ color: textColor }}>
                    Free Board
                  </h2>
                </Link>

                {/* View All → 공개 리스트로 이동 (비로그인도 OK) */}
                <Link to={schoolPath("/freeboard")} className="text-sm text-blue-600 hover:underline">
                  View All
                </Link>
              </div>

              {loadingPosts ? (
                <ul className="space-y-3">
                  {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
                    <li key={i} className="animate-pulse">
                      <div className="h-5 w-2/3 rounded bg-gray-100" />
                      <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
                    </li>
                  ))}
                </ul>
              ) : latestPosts.length === 0 ? (
                <p className="text-sm text-gray-500">Latest posts will appear here.</p>
              ) : (
                <ul className="divide-y">
                  {latestPosts.map((p) => (
                    <li key={p._id || p.id} className="py-3">
                      <button
                        className="block w-full text-left"
                        onClick={() => ensureAuth(() => navigate(schoolPath(`/freeboard/${p._id || p.id}`)))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 line-clamp-2">{p.title}</div>
                          <div className="ml-3 shrink-0 text-xs text-gray-500">
                            {p.createdAt ? dayjs(p.createdAt).fromNow() : ""}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => ensureAuth(() => navigate(schoolPath("/freeboard/write")))}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
                  style={{ backgroundColor: primary }}
                >
                  + Write Post
                </button>
              </div>
            </section>

            {/* Course Hub Preview (materials) */}
            <section className="lg:col-span-4">
              <CourseHubPreview
                school={school}
                primary={primary}
                textColor={textColor}
                ensureAuth={ensureAuth}
                schoolPath={schoolPath}
                navigate={navigate}
              />
            </section>
          </div>

          {/* Bottom: compact Food Map */}
          <section
            onClick={() => navigate(schoolPath("/foodmap"))}
            className="mt-6 cursor-pointer overflow-hidden rounded-2xl border border-sand bg-white p-0 shadow-inner transition hover:shadow-lg"
            title="Go to Food Map"
          >
            <div className="p-6">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold" style={{ color: textColor }}>
                🍽️ Explore Nearby Food
                <span className="ml-2 text-xs text-blue-600 underline">Open map</span>
              </h2>
              <p className="text-sm text-gray-700">
                Discover top-rated restaurants and cafes near campus. Click to open the full map.
              </p>
            </div>

            <div className="h-56 select-none">
              <MapContainer
                center={[SCHOOL_CENTER.lat, SCHOOL_CENTER.lon]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
                attributionControl={false}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[SCHOOL_CENTER.lat, SCHOOL_CENTER.lon]}>
                  <Popup>Campus Center</Popup>
                </Marker>
              </MapContainer>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}




