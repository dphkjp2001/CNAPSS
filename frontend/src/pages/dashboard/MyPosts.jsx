import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { listMyPosts, deletePost } from "../../api/posts";
import { Link, useLocation } from "react-router-dom";


export default function MyPosts() {
  console.log("🟢 MyPosts.jsx mounted");

  console.log("🧭 Loaded MyPosts.jsx component");
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchMyPosts = useCallback(async () => {
    if (!school) return;
    setLoading(true);
    try {
      const data = await listMyPosts({ school });
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts, location.pathname]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePost({ school, id });
      await fetchMyPosts(); // reload fresh from MongoDB
    } catch (e) {
      console.error(e);
      alert("Failed to delete post.");
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">📝 My Posts</h2>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-600">
            Loading…
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-gray-600">You haven’t written any posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li
                key={post._id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex-1">
                  <Link
                    to={schoolPath(`/freeboard/${post._id}`)}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {post.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(post._id)}
                  className="ml-4 shrink-0 rounded-lg bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
