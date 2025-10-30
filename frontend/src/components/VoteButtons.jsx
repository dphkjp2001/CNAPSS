// frontend/src/components/VoteButtons.jsx
import React, { useEffect, useMemo, useState } from "react";
import { votePost } from "../api/posts";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

/**
 * Vertical vote widget for posts.
 *
 * Props:
 * - school: string
 * - postId: string
 * - initialCounts?: { up: number, down: number }
 * - initialVote?: "up" | "down" | null
 * - disabled?: boolean               // e.g., author cannot vote
 * - className?: string
 */
export default function VoteButtons({
  school,
  postId,
  initialCounts = { up: 0, down: 0 },
  initialVote = null,
  disabled = false,
  className = "",
}) {
  const { user } = useAuth();
  const { emit, on } = useSocket();

  const [upCount, setUpCount] = useState(initialCounts.up || 0);
  const [downCount, setDownCount] = useState(initialCounts.down || 0);
  const [myVote, setMyVote] = useState(initialVote);
  const [isVoting, setIsVoting] = useState(false);

  const score = useMemo(() => (upCount || 0) - (downCount || 0), [upCount, downCount]);

  // Sync when props change (e.g., page navigation or refresh)
  useEffect(() => {
    setUpCount(initialCounts.up || 0);
  }, [initialCounts.up]);
  useEffect(() => {
    setDownCount(initialCounts.down || 0);
  }, [initialCounts.down]);
  useEffect(() => {
    setMyVote(initialVote ?? null);
  }, [initialVote]);

  // Join socket room and listen live
  useEffect(() => {
    if (!postId) return;
    emit?.("post:join", { postId });
    const off = on?.("post:voteUpdated", (payload) => {
      if (!payload || payload.postId !== postId) return;
      if (typeof payload.upCount === "number") setUpCount(payload.upCount);
      if (typeof payload.downCount === "number") setDownCount(payload.downCount);
      // myVote isn't changed here (server response only)
    });
    return () => {
      off?.();
      emit?.("post:leave", { postId });
    };
  }, [postId, emit, on]);

  const tryVote = async (dir) => {
    if (disabled || isVoting) return;
    if (!user) {
      alert("Please log in to vote.");
      return;
    }
    // Strict: must cancel before switching (no auto-switch)
    if (myVote && myVote !== dir) {
      alert("Cancel your current vote first.");
      return;
    }

    setIsVoting(true);
    try {
      const res = await votePost({ school, id: postId, dir });
      if (typeof res?.upCount === "number") setUpCount(res.upCount);
      if (typeof res?.downCount === "number") setDownCount(res.downCount);
      if (typeof res?.myVote !== "undefined") setMyVote(res.myVote);
    } catch (err) {
      alert("Vote failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsVoting(false);
    }
  };

  const upActive = myVote === "up";
  const downActive = myVote === "down";

  return (
    <div
      className={`flex flex-col items-center gap-1 select-none ${className}`}
      aria-label="Voting controls"
    >
      {/* Up */}
      <button
        type="button"
        // onClick={() => tryVote("up")}
        disabled={disabled || isVoting || downActive}
        aria-pressed={upActive}
        aria-label="Upvote"
        className={[
          "w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center",
          "hover:bg-slate-50 active:scale-[0.97] transition disabled:opacity-50",
          upActive ? "ring-2 ring-red-200" : "",
        ].join(" ")}
        title={
          disabled
            ? "Voting disabled"
            : downActive
            ? "Cancel your downvote first"
            : "Upvote"
        }
      >
        {/* ▲ icon (pure CSS/SVG) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5l7 9H5l7-9z"
            fill={upActive ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </button>

      {/* Score (up - down) */}
      <div className="px-2 py-1">
        <span className="text-2xl font-extrabold leading-none text-red-600 tabular-nums">
          {score}
        </span>
      </div>

      {/* Down */}
      <button
        type="button"
        // onClick={() => tryVote("down")}
        disabled={disabled || isVoting || upActive}
        aria-pressed={downActive}
        aria-label="Downvote"
        className={[
          "w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center",
          "hover:bg-slate-50 active:scale-[0.97] transition disabled:opacity-50",
          downActive ? "ring-2 ring-slate-300" : "",
        ].join(" ")}
        title={
          disabled
            ? "Voting disabled"
            : upActive
            ? "Cancel your upvote first"
            : "Downvote"
        }
      >
        {/* ▼ icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 19l-7-9h14l-7 9z"
            fill={downActive ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </button>
    </div>
  );
}


