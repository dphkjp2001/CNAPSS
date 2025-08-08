// src/pages/freeboard/FreeBoardList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import { fetchPosts } from "../../api/posts"; // ✅ 분리된 API 사용

dayjs.extend(relativeTime);
dayjs.locale("en");

function FreeBoardList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .catch((err) => {
        console.error("❌ fetchPosts error:", err);
        setError("Failed to load posts.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold"> Free Board</h2>
        {user && (
          <button
            onClick={() => navigate("/freeboard/write")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Write Post
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading posts...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post._id} className="border-b pb-2">
              <Link
                to={`/freeboard/${post._id}`}
                className="text-lg font-medium text-blue-700 hover:underline"
              >
                {post.title}
              </Link>
              <p className="text-sm text-gray-500">
                Posted by anonymous1 • {dayjs(post.createdAt).fromNow()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FreeBoardList;








