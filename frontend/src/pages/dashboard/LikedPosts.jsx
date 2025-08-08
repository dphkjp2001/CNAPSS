// src/pages/dashboard/LikedPosts.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

function LikedPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const baseURL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchLiked = async () => {
      const res = await fetch(`${baseURL}/posts/liked/${user.email}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("❌ Unexpected data from API:", data);
        setPosts([]);
        return;
      }

      setPosts(data);
    };
    fetchLiked();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-heading mb-6">👍 Liked Posts</h2>
      {posts.length === 0 ? (
        <p className="text-gray-500">You haven’t liked any posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post._id}>
              <Link to={`/freeboard/${post._id}`} className="text-blue-600 hover:underline">
                {post.title}
              </Link>
              <p className="text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LikedPosts;
