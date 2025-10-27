import React, { useState, useCallback } from 'react';
import { cn } from '../utils/tailwind';
import { useSchool } from '../contexts/SchoolContext';
import { votePost } from '../api/posts';
import { voteAcademicPost } from '../api/academicPosts';

/**
 * Reusable ^ / v vote buttons
 *
 * Props:
 * - targetType: "free" | "academic" | "Post" | "AcademicPost" (유연 처리)
 * - targetId: string
 * - initialCounts: { up:number, down:number } | { upCount:number, downCount:number }
 * - initialVote: "up" | "down" | null | 1 | -1 | 0
 * - onVoteChange?: ({ counts, myVote }) => void
 * - disabled?: boolean
 * - className?: string
 */
const VoteButtons = ({
  targetType = "free",
  targetId,
  initialCounts = { up: 0, down: 0 },
  initialVote = null,
  onVoteChange,
  disabled = false,
  className
}) => {
  const { school } = useSchool();

  const normCounts = {
    up: typeof initialCounts.up === "number" ? initialCounts.up : (initialCounts.upCount || 0),
    down: typeof initialCounts.down === "number" ? initialCounts.down : (initialCounts.downCount || 0),
  };
  const normVote =
    initialVote === 1 ? "up" :
    initialVote === -1 ? "down" :
    initialVote === 0 ? null :
    initialVote;

  const [counts, setCounts] = useState(normCounts);
  const [myVote, setMyVote] = useState(normVote);
  const [isVoting, setIsVoting] = useState(false);

  const isAcademic = /academic/i.test(String(targetType || ""));

  const callApi = (dir) => {
    if (isAcademic) return voteAcademicPost({ school, id: targetId, dir });
    return votePost({ school, id: targetId, dir });
  };

  const handleVote = useCallback(async (dir) => {
    if (disabled || isVoting) return;

    // 낙관적 업데이트
    setIsVoting(true);
    const snap = { counts: { ...counts }, myVote };

    let up = counts.up, down = counts.down, next = myVote;
    if (dir === "up") {
      if (myVote === "up") { up -= 1; next = null; }
      else if (myVote === "down") { down -= 1; up += 1; next = "up"; }
      else { up += 1; next = "up"; }
    } else {
      if (myVote === "down") { down -= 1; next = null; }
      else if (myVote === "up") { up -= 1; down += 1; next = "down"; }
      else { down += 1; next = "down"; }
    }
    setCounts({ up, down });
    setMyVote(next);

    try {
      const res = await callApi(dir);
      const upCount = typeof res?.upCount === "number" ? res.upCount : up;
      const downCount = typeof res?.downCount === "number" ? res.downCount : down;
      const my = typeof res?.myVote !== "undefined" ? res.myVote : next;
      setCounts({ up: upCount, down: downCount });
      setMyVote(my);
      onVoteChange?.({ counts: { up: upCount, down: downCount }, myVote: my });
    } catch (error) {
      console.error('Vote error:', error);
      // 롤백
      setCounts(snap.counts);
      setMyVote(snap.myVote);
    } finally {
      setIsVoting(false);
    }
  }, [disabled, isVoting, counts, myVote, school, targetId, isAcademic, onVoteChange]);

  const buttonClassName = useCallback((active) => cn(
    "flex items-center gap-1 px-2 py-1 rounded",
    "transition-colors duration-200",
    "hover:bg-gray-100 active:bg-gray-200",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    active && "text-blue-600 font-medium"
  ), []);

  const iconClassName = useCallback((type, active) => cn(
    "w-4 h-4",
    "transition-colors duration-200",
    active && (type === 'up' ? "text-blue-600" : "text-red-600")
  ), []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={() => handleVote("up")}
        disabled={disabled || isVoting}
        className={buttonClassName(myVote === "up")}
        aria-label="Upvote"
        title={disabled ? "You can’t vote on your own post." : "Upvote"}
      >
        <svg className={iconClassName('up', myVote === "up")} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span>{counts.up}</span>
      </button>

      <button
        onClick={() => handleVote("down")}
        disabled={disabled || isVoting}
        className={buttonClassName(myVote === "down")}
        aria-label="Downvote"
        title={disabled ? "You can’t vote on your own post." : "Downvote"}
      >
        <svg className={iconClassName('down', myVote === "down")} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span>{counts.down}</span>
      </button>
    </div>
  );
};

export default VoteButtons;
