import React, { useState, useCallback } from 'react';
import { voteApi } from '../api/votes.api';
import { cn } from '../utils/tailwind';

const VoteButtons = ({ 
  targetType, 
  targetId, 
  initialCounts = { up: 0, down: 0 }, 
  initialVote = 0,
  onVoteChange,
  disabled = false,
  className
}) => {
  const [counts, setCounts] = useState(initialCounts);
  const [myVote, setMyVote] = useState(initialVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = useCallback(async (newValue) => {
    if (disabled || isVoting) return;

    try {
      setIsVoting(true);
      const effectiveValue = myVote === newValue ? 0 : newValue;
      
      const { target } = await voteApi.vote({
        targetType,
        targetId,
        value: effectiveValue
      });

      setCounts(target.counts);
      setMyVote(effectiveValue);
      onVoteChange?.({ counts: target.counts, myVote: effectiveValue });

    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  }, [targetType, targetId, myVote, disabled, isVoting, onVoteChange]);

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
        onClick={() => handleVote(1)}
        disabled={disabled || isVoting}
        className={buttonClassName(myVote === 1)}
      >
        <svg 
          className={iconClassName('up', myVote === 1)}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" 
            clipRule="evenodd"
          />
        </svg>
        <span>{counts.up}</span>
      </button>

      <button
        onClick={() => handleVote(-1)}
        disabled={disabled || isVoting}
        className={buttonClassName(myVote === -1)}
      >
        <svg 
          className={iconClassName('down', myVote === -1)}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path 
            fillRule="evenodd"
            d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
            clipRule="evenodd"  
          />
        </svg>
        <span>{counts.down}</span>
      </button>
    </div>
  );
};

export default VoteButtons;