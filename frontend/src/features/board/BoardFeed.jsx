import React from "react";
import { useParams } from "react-router-dom";
import { listPosts } from "../../api/posts.api.js";
import VoteButtons from "./VoteButtons.jsx";

function PostCard({ post, onOpen }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3 hover:shadow-sm transition">
      <div className="text-xs text-gray-500 mb-1">
        {post.board === "academic" ? "Academic" : "Freeboard"} · {post.type}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 cursor-pointer" onClick={() => onOpen(post._id)}>
        {post.title}
      </h3>
      <p className="text-gray-700 line-clamp-3 mb-3">{post.body}</p>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          by {post.authorAlias} · {new Date(post.createdAt).toLocaleString()}
        </div>
        <div className="flex items-center gap-3">
          <VoteButtons targetType="post" targetId={post._id} score={post.score} myVote={post.myVote} compact />
          <div className="text-sm text-gray-600">💬 {post.commentCount}</div>
        </div>
      </div>
    </div>
  );
}

export default function BoardFeed({ board, type, sort, onOpenDetail }) {
  const { school } = useParams();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listPosts(school, { board, type, sort, page: 1, limit: 20 });
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, board, type, sort]);

  if (loading) return <div className="p-6 text-gray-500">Loading feed...</div>;
  if (!items.length) return <div className="p-6 text-gray-500">No posts yet.</div>;

  return (
    <div>
      {items.map(p => (
        <PostCard key={p._id} post={p} onOpen={onOpenDetail} />
      ))}
    </div>
  );
}
