// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { fetchPosts } from "../../api/posts";

// Mini map preview (Leaflet)
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, schoolTheme, loading } = useSchool();
  const schoolPath = useSchoolPath();

  const [latestPosts, setLatestPosts] = useState([]);

  // Center for mini map (NYU fallback)
  const SCHOOL_CENTER = useMemo(() => {
    // You can store per-school center in SchoolContext and branch here.
    return { lat: 40.7291, lon: -73.9965 }; // NYU
  }, []);

  if (loading) return null;
  if (!school) return <Navigate to="/select-school" />;

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPosts(school); // ✅ scoped list
        const sliced = Array.isArray(data) ? data.slice(0, 5) : [];
        setLatestPosts(sliced);
      } catch (err) {
        console.error("Failed to load posts:", err);
        setLatestPosts([]);
      }
    })();
  }, [school]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: schoolTheme.bg }}>
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-6 py-12 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 rounded-2xl border border-sand bg-white/80 p-6 shadow-md backdrop-blur-md lg:w-72">
          <div className="text-center">
            <div
              className="mx-auto h-20 w-20 rounded-full"
              style={{ backgroundColor: schoolTheme.primary }}
            />
            <p className="mt-4 text-xl font-bold" style={{ color: schoolTheme.text }}>
              {user?.nickname}
            </p>
            <p className="text-sm text-gray-500">{school.toUpperCase()}</p>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li>
              <Link to={schoolPath("/myposts")} className="transition hover:text-softGold">
                My Posts
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/liked")} className="transition hover:text-softGold">
                Liked
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/commented")} className="transition hover:text-softGold">
                Commented
              </Link>
            </li>
            <li>
              <Link
                to={schoolPath("/personal-schedule")}
                className="transition hover:text-softGold"
              >
                Schedule
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/market")} className="transition hover:text-softGold">
                Marketplace
              </Link>
            </li>
            <li>
              <Link to={schoolPath("/foodmap")} className="transition hover:text-softGold">
                Food Map
              </Link>
            </li>
          </ul>
        </aside>

        {/* Main content */}
        <main className="flex w-full flex-1 flex-col gap-6">
          {/* Free Board Preview */}
          <section className="w-full rounded-2xl border border-sand bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <Link to={schoolPath("/freeboard")}>
                <h2
                  className="cursor-pointer text-2xl font-bold hover:underline"
                  style={{ color: schoolTheme.text }}
                >
                  Free Board
                </h2>
              </Link>

              <Link
                to={schoolPath("/freeboard")}
                className="text-sm text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            {latestPosts.length > 0 ? (
              <ul className="space-y-3">
                {latestPosts.map((post) => (
                  <li
                    key={post._id}
                    className="rounded-xl border border-gray-200 px-6 py-4 shadow transition hover:shadow-md"
                  >
                    <Link
                      to={schoolPath(`/freeboard/${post._id}`)}
                      className="block text-base font-semibold text-gray-900 hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Latest posts will appear here.</p>
            )}
          </section>

          {/* Food Map Card with mini map preview */}
          <section
            onClick={() => navigate(schoolPath("/foodmap"))}
            className="cursor-pointer overflow-hidden rounded-2xl border border-sand bg-white p-0 shadow-inner transition hover:shadow-lg"
            title="Go to Food Map"
          >
            <div className="p-6">
              <h2
                className="mb-1 flex items-center gap-2 text-lg font-semibold"
                style={{ color: schoolTheme.text }}
              >
                🍽️ Explore Nearby Food
                <span className="ml-2 text-xs text-blue-600 underline">Open map</span>
              </h2>
              <p className="text-sm text-gray-700">
                Discover top‑rated restaurants and cafes near campus. Click to open the full map.
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

