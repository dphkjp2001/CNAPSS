// frontend/src/pages/dashboard/Dashboard.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { Navigate, Link } from "react-router-dom";

function Dashboard() {
  const { user } = useAuth();
  const { school, schoolTheme, loading } = useSchool();
  const [latestPosts, setLatestPosts] = useState([]);
  const baseURL = import.meta.env.VITE_API_URL;

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

          {/* Announcements */}
          <section
            className="w-full rounded-2xl p-6 border border-sand shadow-inner"
            style={{ backgroundColor: "#f8f5ff" }}
          >
            <h2
              className="font-heading text-lg mb-2 font-semibold"
              style={{ color: schoolTheme.text }}
            >
              Announcements
            </h2>
            <p className="text-gray-700 text-sm">
              New features are coming soon!
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

