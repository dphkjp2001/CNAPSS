// src/pages/freeboard/FreeBoardWrite.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AsyncButton from "../../components/AsyncButton";
import { createPost } from "../../api/posts"; // ✅ API 분리된 함수 가져오기

function FreeBoardWrite() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  if (!user) return <p>Loading user information...</p>;

  const handleSubmit = async () => {
    try {
      await createPost({
        title,
        content,
        email: user.email,
        nickname: user.nickname,
      });

      alert("Post submitted!");
      navigate("/freeboard");
    } catch (err) {
      console.error("Post creation error:", err);
      alert(err.message || "Unexpected error occurred.");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">New Post</h2>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title"
          className="w-full border p-2"
          required
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your content here..."
          className="w-full border p-2"
          rows={8}
          required
        />
        <div className="flex gap-2">
          <AsyncButton
            onClick={handleSubmit}
            loadingText="Posting..."
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Post
          </AsyncButton>
          <button
            type="button"
            onClick={() => navigate("/freeboard")}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default FreeBoardWrite;

