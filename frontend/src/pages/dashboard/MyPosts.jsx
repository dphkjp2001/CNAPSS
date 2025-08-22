// frontend/src/pages/dashboard/MyPosts.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { useSchoolPath } from "../../utils/schoolPath";
import { fetchPosts } from "../../api/posts";
import { Link } from "react-router-dom";

export default function MyPosts() {
  const { user } = useAuth();
  const { school, schoolTheme } = useSchool();
  const schoolPath = useSchoolPath();

  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!school) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchPosts(school); // ✅ scoped list
        setAllPosts(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message || "Failed to load posts.");
      } finally {
        setLoading(false);
      }
    })();
  }, [school]);

  const myPosts = useMemo(() => {
    const me = user?.email;
    if (!me) return [];
    return allPosts
      .filter((p) => p.email === me)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allPosts, user?.email]);

  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6"
      style={{ backgroundColor: schoolTheme?.bg || "#f6f3ff" }}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">My Posts</h2>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-600">
            Loading…
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : myPosts.length === 0 ? (
          <p className="text-gray-600">You haven’t posted anything yet.</p>
        ) : (
          <ul className="space-y-4">
            {myPosts.map((post) => (
              <li
                key={post._id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <Link
                  to={schoolPath(`/freeboard/${post._id}`)}
                  className="text-lg font-semibold text-gray-900 hover:underline"
                >
                  {post.title}
                </Link>
                <p className="text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                  {post.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

