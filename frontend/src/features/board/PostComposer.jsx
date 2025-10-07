import React from "react";
import { useParams } from "react-router-dom";
import { createPost, listPosts } from "../../api/posts.api.js";
import AsyncButton from "../../components/AsyncButton.jsx";

export default function PostComposer({ board, type }) {
  const { school } = useParams();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  async function submit() {
    if (!title.trim()) return;
    await createPost(school, { board, type, title, body, anonymous: true });
    setTitle(""); setBody("");
    // no global state here; feed component will reload when filter changes
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-sm text-gray-500 mb-2">
        New {board === "academic" ? (type === "looking" ? "Looking For" : "Academic") : "Freeboard"} Post
      </div>
      <input
        className="w-full border rounded-lg px-3 py-2 mb-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full border rounded-lg px-3 py-2 mb-3 resize-y min-h-[120px]"
        placeholder="Write something..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <AsyncButton onClick={submit} className="w-full">Publish</AsyncButton>
    </div>
  );
}
