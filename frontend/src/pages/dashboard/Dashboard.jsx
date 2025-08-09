// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { Navigate, Link, useNavigate } from "react-router-dom";

// Mini map preview (Leaflet)
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, schoolTheme, loading } = useSchool();
  const [latestPosts, setLatestPosts] = useState([]);
  const baseURL = import.meta.env.VITE_API_URL;

  // Center for mini map (NYU fallback)
  // TODO: if you store lat/lon per school in SchoolContext, replace here
  const SCHOOL_CENTER = useMemo(() => {
    // NYU default
    return { lat: 40.7291, lon: -73.9965 };
  }, []);

  if (loading) return null;
  if (!school) return <Navigate to="/select-school" />;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${baseURL}/posts`);
        const data = await res.json();
        if (Array.isArray(data)) setLatestPosts(data.slice(0, 5));
      } catch (err) {
        console.error("게시글 로딩 실패:", err);
      }
    };
    fetchPosts();
  }, [baseURL]);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: schoolTheme.bg }}
    >
      <div className="w-full max-w-screen-xl mx-auto flex flex-col lg:flex-row gap-8 px-6 py-12">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 rounded-2xl p-6 shadow-md border border-sand bg-white/80 backdrop-blur-md shrink-0">
          <div className="text-center">
            <div
              className="w-20 h-20 mx-auto rounded-full"
              style={{ backgroundColor: schoolTheme.primary }}
            />
            <p
              className="mt-4 font-heading text-xl font-bold"
              style={{ color: schoolTheme.text }}
            >
              {user?.nickname}
            </p>
            <p className="text-sm text-gray-500">{school.toUpperCase()}</p>
          </div>
          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            <li>
              <Link to="/myposts" className="hover:text-softGold transition">
                My Posts
              </Link>
            </li>
            <li>
              <Link to="/liked" className="hover:text-softGold transition">
                Liked
              </Link>
            </li>
            <li>
              <Link to="/commented" className="hover:text-softGold transition">
                Commented
              </Link>
            </li>
            <li>
              <Link to="/schedule" className="hover:text-softGold transition">
                Schedule Grid
              </Link>
            </li>
            <li>
              <Link to="/market" className="hover:text-softGold transition">
                Marketplace
              </Link>
            </li>
            {/* Optional: keep a direct link too */}
            <li>
              <Link to="/foodmap" className="hover:text-softGold transition">
                Food Map
              </Link>
            </li>
          </ul>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col gap-6 w-full">
          {/* Free Board Preview */}
          <section className="w-full bg-white rounded-2xl p-6 border border-sand shadow-md">
            <div className="flex items-center justify-between mb-4">
              <Link to="/freeboard">
                <h2
                  className="font-heading text-2xl font-bold hover:underline cursor-pointer"
                  style={{ color: schoolTheme.text }}
                >
                  Free Board
                </h2>
              </Link>

              <Link
                to="/freeboard"
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
                    className="bg-white border border-gray-200 rounded-xl px-6 py-4 hover:shadow transition"
                  >
                    <Link
                      to={`/freeboard/${post._id}`}
                      className="block font-semibold text-gray-900 hover:underline text-base"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Latest posts will appear here soon.
              </p>
            )}
          </section>

          {/* Announcements → Clickable Food Map Card with mini map preview */}
          <section
            onClick={() => navigate("/foodmap")}
            className="w-full rounded-2xl p-0 border border-sand shadow-inner cursor-pointer hover:shadow-lg transition bg-white overflow-hidden"
            style={{ backgroundColor: "#f8f5ff" }}
            title="Go to Food Map"
          >
            <div className="p-6">
              <h2
                className="font-heading text-lg mb-1 font-semibold flex items-center gap-2"
                style={{ color: schoolTheme.text }}
              >
                🍽️ Explore Nearby Food
                <span className="text-xs text-blue-600 underline ml-2">Open map</span>
              </h2>
              <p className="text-gray-700 text-sm">
                Discover top‑rated restaurants and cafes near campus. Click to open the full map.
              </p>
            </div>

            {/* Mini map preview (non-interactive) */}
            <div className="h-56 pointer-events-none select-none">
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

export default Dashboard;
