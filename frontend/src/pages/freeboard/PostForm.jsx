// frontend/src/pages/freeboard/PostForm.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import AsyncButton from "../../components/AsyncButton";
import { createPost } from "../../api/posts";

function PostForm({ onPostSubmit }) {
  const { user } = useAuth();
  const { school } = useSchool();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    if (!school) {
      alert("Please select a school first.");
      return;
    }
    setPosting(true);
    try {
      // ✅ API wrapper ensures URL = /api/:school/posts
      const newPost = await createPost({
        school,
        title: title.trim(),
        content: content.trim(),
      });
      onPostSubmit?.(newPost);
      setTitle("");
      setContent("");
    } catch (err) {
      alert(err?.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="mb-6 space-y-2">
      <input
        type="text"
        placeholder="Enter a title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <textarea
        placeholder="Write your post here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border p-2 rounded h-40 resize-y"
        required
      />
      <AsyncButton
        onClick={handleSubmit}
        loading={posting}
        loadingText="Posting..."
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Post
      </AsyncButton>
    </form>
  );
}

export default PostForm;



