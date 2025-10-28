import React, { useState, useCallback } from "react";
import { cn } from "../utils/tailwind";
import { useSchool } from "../contexts/SchoolContext";
import { votePost } from "../api/posts";
import { voteAcademicPost } from "../api/academicPosts";

export default function VoteButtons({
  targetType = "free",
  targetId,
  initialCounts = { up: 0, down: 0 },
  initialVote = null,
  disabled = false,
  className,
  hide = false,
}) {
  const { school } = useSchool();

  const normCounts = {
    up: typeof initialCounts.up === "number" ? initialCounts.up : (initialCounts.upCount || 0),
    down: typeof initialCounts.down === "number" ? initialCounts.down : (initialCounts.downCount || 0),
  };
  const normVote =
    initialVote === 1 ? "up" :
    initialVote === -1 ? "down" :
    initialVote === 0 ? null : initialVote;

  const [counts, setCounts] = useState(normCounts);
  const [my, setMy] = useState(normVote);
  const [busy, setBusy] = useState(false);

  const isAcademic = /academic/i.test(String(targetType || ""));
  const callApi = (dir) =>
    isAcademic
      ? voteAcademicPost({ school, id: targetId, dir })
      : votePost({ school, id: targetId, dir });

  const handle = useCallback(async (dir) => {
    if (busy || disabled) return;
    // strict: must cancel before switching
    if (my && my !== dir) return;

    setBusy(true);
    try {
      const res = await callApi(dir);
      const up = typeof res?.upCount === "number" ? res.upCount : counts.up;
      const down = typeof res?.downCount === "number" ? res.downCount : counts.down;
      const myVote = typeof res?.myVote !== "undefined" ? res.myVote : my;
      setCounts({ up, down });
      setMy(myVote);
    } catch (e) {
      console.error("vote failed", e);
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, my, counts, targetId, school, isAcademic]);

  if (hide) return null;

  const upActive = my === "up";
  const downActive = my === "down";

  const btn = (active, type) =>
    cn(
      "flex items-center gap-1 px-2 py-1 rounded transition-colors duration-150",
      "hover:bg-gray-100 active:bg-gray-200",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      active && (type === "up" ? "text-red-600" : "text-blue-600")
    );

  const icon = (type, active) =>
    cn("w-4 h-4", active && (type === "up" ? "text-red-600" : "text-blue-600"));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        className={btn(upActive, "up")}
        onClick={() => handle("up")}
        disabled={disabled || busy || downActive}
        aria-label="Upvote"
        title={downActive ? "Cancel your downvote first" : "Upvote"}
      >
        <svg className={icon("up", upActive)} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" />
        </svg>
        <span>{counts.up}</span>
      </button>

      <button
        className={btn(downActive, "down")}
        onClick={() => handle("down")}
        disabled={disabled || busy || upActive}
        aria-label="Downvote"
        title={upActive ? "Cancel your upvote first" : "Downvote"}
      >
        <svg className={icon("down", downActive)} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" />
        </svg>
        <span>{counts.down}</span>
      </button>
    </div>
  );
}

