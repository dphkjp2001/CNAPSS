//  src/pages/freeboard/PostItem.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

function PostItem({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);

  const baseURL = import.meta.env.VITE_API_URL;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`${baseURL}/posts/${post._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (res.ok) {
        onDelete(post._id);
      } else {
        alert(data.message || "Failed to delete post.");
      }
    } catch (err) {
      alert("Failed to delete post: " + err.message);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${baseURL}/posts/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });

      const updated = await res.json();
      if (res.ok) {
        onUpdate(updated);
        setIsEditing(false);
      } else {
        alert(updated.message || "Failed to save changes.");
      }
    } catch (err) {
      alert("Failed to update post: " + err.message);
    }
  };

  return (
    <div className="border p-4 rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-1">{post.title}</h3>
      <p className="text-sm text-gray-500 mb-2">Posted by: {post.author}</p>

      {isEditing ? (
        <textarea
          className="w-full border p-2 mb-2"
          rows={3}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
        />
      ) : (
        <p className="mb-2 whitespace-pre-wrap">{post.content}</p>
      )}

      {user?.nickname === post.author && (
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-yellow-400 text-white px-3 py-1 rounded"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PostItem;


