import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AsyncButton from "../../components/AsyncButton";

function PostForm({ onPostSubmit }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const baseURL = import.meta.env.VITE_API_URL;

  const handleSubmit = async () => {
    const res = await fetch(`${baseURL}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        title,
        content,
      }),
    });

    const newPost = await res.json();
    if (!res.ok) throw new Error(newPost.message || "Failed to post");

    onPostSubmit(newPost);
    setTitle("");
    setContent("");
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="mb-6 space-y-2">
      <input
        type="text"
        placeholder="Enter a title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2"
        required
      />
      <textarea
        placeholder="Write your post here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border p-2"
        rows={4}
        required
      />
      <AsyncButton
        onClick={handleSubmit}
        loadingText="Posting..."
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Post
      </AsyncButton>
    </form>
  );
}

export default PostForm;


