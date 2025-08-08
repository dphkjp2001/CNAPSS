// src/pages/freeboard/FreeBoardDetail.jsx
//반응형 수정 함
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import CommentSection from "../../components/CommentSection";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";

import {
  fetchPostById,
  deletePost,
  togglePostLike,
} from "../../api/posts"; // ✅ 분리된 API 불러오기

dayjs.extend(relativeTime);
dayjs.locale("en");

function FreeBoardDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  const loadPost = async () => {
    try {
      const data = await fetchPostById(id);
      setPost(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(id, user.email);
      alert("Post deleted successfully");
      navigate("/freeboard");
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleThumb = async () => {
    try {
      await togglePostLike(id, user.email);
      loadPost();
    } catch (err) {
      alert("추천 실패: " + err.message);
    }
  };

  if (error) return <p className="text-red-500">{error}</p>;
  if (!post) return <p>Loading...</p>;

  const isAuthor = user?.email === post.email;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-3xl mx-auto"> {/* ✅ 수정됨 */}
      <div className="bg-white shadow-md rounded-2xl px-4 py-5 sm:p-6 mb-6"> {/* ✅ 수정됨 */}
        <h2 className="text-xl sm:text-2xl font-bold mb-2"> {/* ✅ 수정됨 */}
          {post.title}
        </h2>
        <p className="text-gray-500 text-xs sm:text-sm mb-4"> {/* ✅ 수정됨 */}
          Posted by anonymous1 • {dayjs(post.createdAt).fromNow()}
        </p>
        <p className="text-sm sm:text-base mb-6 whitespace-pre-wrap"> {/* ✅ 수정됨 */}
          {post.content}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4"> {/* ✅ 수정됨 */}
          <button
            onClick={handleThumb}
            className="text-xs sm:text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
          >
            👍 {post.thumbsUpUsers?.length || 0}
          </button>

          {isAuthor && (
            <>
              <button
                onClick={() => navigate(`/freeboard/edit/${post._id}`)}
                className="px-4 py-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-medium rounded-xl"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl"
              >
                Delete
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => navigate("/freeboard")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to List
        </button>
      </div>

      {post?._id && (
        <CommentSection postId={post._id} postAuthorEmail={post.email} />
      )}
    </div>
  );
}

export default FreeBoardDetail;