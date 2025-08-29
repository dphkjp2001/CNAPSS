//  frontend/src/pages/freeboard/PostItem.jsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";
import { updatePost, deletePost } from "../../api/posts";

function PostItem({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const { school } = useSchool();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [loading, setLoading] = useState(false);

  const isAuthor =
    String(user?.email || "").toLowerCase() === String(post?.email || "").toLowerCase();

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    if (!school || !post?._id) return;

    try {
      setLoading(true);
      await deletePost({ school, id: post._id }); // ✅ /:school/posts/:id
      onDelete?.(post._id);
    } catch (err) {
      alert("Failed to delete post: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!school || !post?._id) return;

    try {
      setLoading(true);
      const updated = await updatePost({
        school,
        id: post._id,
        title: post.title,          // 인라인 편집은 content만 바꾸고 title은 유지
        content: editedContent,
      });
      onUpdate?.(updated?.post || updated); // 래퍼가 반환하는 형태 대응
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update post: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border p-4 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold">{post.title}</h3>
      <p className="mb-2 text-sm text-gray-500">
        Posted by: {post.nickname ? "anonymous" : "anonymous"}
      </p>

      {isEditing ? (
        <textarea
          className="mb-2 w-full resize-y rounded border p-2"
          rows={3}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
        />
      ) : (
        <p className="mb-2 whitespace-pre-wrap">{post.content}</p>
      )}

      {isAuthor && (
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded bg-green-500 px-3 py-1 text-white disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(post.content);
                }}
                className="rounded bg-gray-400 px-3 py-1 text-white"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded bg-yellow-500 px-3 py-1 text-white"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded bg-red-500 px-3 py-1 text-white disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PostItem;



