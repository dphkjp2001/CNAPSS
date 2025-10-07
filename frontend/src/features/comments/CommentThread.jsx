import React from "react";
import { useParams } from "react-router-dom";
import { listComments, createComment, deleteComment } from "../../api/comments.api.js";
// ✅ 경로 확정: comments -> board
import VoteButtons from "../../board/VoteButtons.jsx";
import AsyncButton from "../../components/AsyncButton.jsx";

function buildTree(flat) {
  const byId = new Map(flat.map((c) => [c._id, { ...c, children: [] }]));
  const roots = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId).children.push(c);
    else roots.push(c);
  }
  return roots;
}

function CommentItem({ node, school, postId, onRefresh }) {
  const [openReply, setOpenReply] = React.useState(false);
  const [replyBody, setReplyBody] = React.useState("");

  async function submitReply() {
    if (!replyBody.trim()) return;
    await createComment(school, postId, { body: replyBody, parentId: node._id, anonymous: true });
    setOpenReply(false);
    setReplyBody("");
    onRefresh(); // trigger reload via refetch in parent
  }

  async function remove() {
    if (!confirm("Delete this comment and its replies?")) return;
    await deleteComment(school, node._id);
    onRefresh();
  }

  return (
    <div className="border-l pl-3">
      <div className="py-2">
        <div className="text-xs text-gray-500 mb-1">
          {node.authorAlias} · {new Date(node.createdAt).toLocaleString()}
        </div>
        <div className="text-gray-800 whitespace-pre-wrap mb-2">{node.body}</div>
        <div className="flex items-center gap-3">
          <VoteButtons targetType="comment" targetId={node._id} score={node.score} myVote={node.myVote} compact />
          <button className="text-sm text-gray-600 hover:underline" onClick={() => setOpenReply((v) => !v)}>
            {openReply ? "Cancel" : "Reply"}
          </button>
          {node.isMine && (
            <button className="text-sm text-red-600 hover:underline" onClick={remove}>
              Delete
            </button>
          )}
        </div>
        {openReply && (
          <div className="mt-2">
            <textarea
              className="w-full border rounded-lg px-3 py-2 mb-2 resize-y min-h-[80px]"
              placeholder="Write a reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
            />
            <AsyncButton onClick={submitReply}>Reply</AsyncButton>
          </div>
        )}
      </div>
      {node.children?.length > 0 && (
        <div className="pl-4 border-l">
          {node.children.map((child) => (
            <CommentItem key={child._id} node={child} school={school} postId={postId} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({ post }) {
  const { school } = useParams();
  const [flat, setFlat] = React.useState([]);
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  const refresh = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listComments(school, post._id);
        setFlat(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, post._id, reloadKey]);

  async function submitRoot() {
    if (!body.trim()) return;
    try {
      await createComment(school, post._id, { body, anonymous: true });
      setBody("");
      refresh();
    } catch (e) {
      if (e.status === 429) {
        alert(e.data?.message || "You are commenting too fast.");
      } else {
        alert(e.data?.message || "Failed to comment");
      }
    }
  }

  const tree = buildTree(flat);

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Comments</h3>
      <div className="mb-3">
        <textarea
          className="w-full border rounded-lg px-3 py-2 mb-2 resize-y min-h-[100px]"
          placeholder="Write a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <AsyncButton onClick={submitRoot}>Comment</AsyncButton>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading comments...</div>
      ) : tree.length === 0 ? (
        <div className="text-gray-500">No comments yet.</div>
      ) : (
        <div className="space-y-2">
          {tree.map((n) => (
            <CommentItem key={n._id} node={n} school={school} postId={post._id} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
