import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getPost, votePost } from "../../api/posts.api.js";
import VoteButtons from "./VoteButtons.jsx";
import CommentThread from "../comments/CommentThread.jsx";
import AsyncButton from "../../components/AsyncButton.jsx";
import { createRequest } from "../../api/requests.api.js";

export default function PostDetail({ onClose }) {
  const { school, postId } = useParams();
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getPost(school, postId);
        setPost(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, postId]);

  async function requestAcceptFlow() {
    // For Looking For details: create a request (no comments)
    const r = await createRequest(school, { postId });
    alert("Request sent!");
  }

  if (loading) return null;
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 h-full w-full max-w-3xl bg-white shadow-xl overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">{post.board} · {post.type}</div>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <div className="text-xs text-gray-500">by {post.authorAlias}</div>
          </div>
          <button className="text-gray-600 hover:text-black" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 space-y-4">
          <p className="whitespace-pre-wrap text-gray-800">{post.body}</p>
          <div className="flex items-center gap-4">
            <VoteButtons targetType="post" targetId={post._id} score={post.score} myVote={post.myVote} />
            <div className="text-sm text-gray-600">💬 {post.commentCount}</div>
          </div>

          {post.board === "academic" && post.type === "looking" ? (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Comments are disabled. Send a request instead.</div>
              <AsyncButton onClick={requestAcceptFlow}>Send Request</AsyncButton>
            </div>
          ) : (
            <CommentThread post={post} />
          )}
        </div>
      </div>
    </div>
  );
}
