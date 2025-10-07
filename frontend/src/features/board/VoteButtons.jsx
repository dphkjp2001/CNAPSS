import React from "react";
import { useParams } from "react-router-dom";
import { votePost } from "../api/posts.api.js";
import { voteComment } from "../api/comments.api.js";

export default function VoteButtons({
  targetType,       // "post" | "comment"
  targetId,
  score: initialScore = 0,
  myVote: initialMyVote = 0,
  compact = false
}) {
  const { school } = useParams();
  const [score, setScore] = React.useState(initialScore);
  const [myVote, setMyVote] = React.useState(initialMyVote);

  React.useEffect(() => {
    setScore(initialScore);
    setMyVote(initialMyVote);
  }, [initialScore, initialMyVote, targetId]);

  async function setVote(v) {
    const api = targetType === "post" ? votePost : voteComment;
    const prev = { score, myVote };
    const nextMy = myVote === v ? 0 : v;       // toggle
    const delta = nextMy - myVote;             // -1, 0, +1
    setMyVote(nextMy);
    setScore(score + delta);
    try {
      const res = await api(school, targetId, nextMy);
      setScore(res.score);
      setMyVote(res.myVote);
    } catch (e) {
      // revert on error
      setScore(prev.score);
      setMyVote(prev.myVote);
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 ${compact ? "" : "border rounded-full px-3 py-1"}`}>
      <button
        onClick={() => setVote(1)}
        className={`px-2 py-1 rounded ${myVote === 1 ? "bg-gray-900 text-white" : "bg-gray-100"}`}
        aria-label="Upvote"
      >▲</button>
      <span className="min-w-[2rem] text-center text-sm">{score}</span>
      <button
        onClick={() => setVote(-1)}
        className={`px-2 py-1 rounded ${myVote === -1 ? "bg-gray-900 text-white" : "bg-gray-100"}`}
        aria-label="Downvote"
      >▼</button>
    </div>
  );
}

