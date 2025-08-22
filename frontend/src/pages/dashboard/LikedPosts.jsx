// frontend/src/pages/dashboard/LikedPosts.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { fetchLikedPosts } from "../../api/posts";
import { Link } from "react-router-dom";

export default function LikedPosts() {
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user?.email || !school) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchLikedPosts(user.email, school); // ✅ scoped
        setPosts(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message || "Failed to load liked posts.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email, school]);

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">👍 Liked Posts</h2>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-600">
            Loading…
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-gray-600">You haven’t liked any posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li
                key={post._id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <Link
                  to={schoolPath(`/freeboard/${post._id}`)}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {post.title}
                </Link>
                <p className="text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

