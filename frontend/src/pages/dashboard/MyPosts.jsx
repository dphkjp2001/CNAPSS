// src/pages/dashboard/MyPosts.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

function MyPosts() {
  const { user } = useAuth();
  const [myPosts, setMyPosts] = useState([]);
  const baseURL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${baseURL}/posts`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data.filter((p) => p.email === user?.email);
          setMyPosts(filtered.reverse()); // 최신 글이 위로
        }
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    };
    fetchPosts();
  }, [user, baseURL]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-heading mb-6"> My Posts</h2>

      {myPosts.length === 0 ? (
        <p className="text-gray-500">You haven’t posted anything yet.</p>
      ) : (
        <ul className="space-y-4">
          {myPosts.map((post) => (
            <li
              key={post._id}
              className="bg-white shadow rounded p-4 border border-gray-200"
            >
              <Link
                to={`/freeboard/${post._id}`}
                className="text-lg font-semibold text-softGold hover:underline"
              >
                {post.title}
              </Link>
              <p className="text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-700 mt-2 truncate">
                {post.content.slice(0, 100)}...
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyPosts;
