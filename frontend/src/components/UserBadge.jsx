import React from 'react';
import { cn } from '../utils/tailwind';

const tierConfig = {
  bronze: {
    color: 'bg-amber-700',
    label: 'Bronze'
  },
  silver: {
    color: 'bg-slate-400',
    label: 'Silver'
  },
  gold: {
    color: 'bg-yellow-500',
    label: 'Gold'
  },
  platinum: {
    color: 'bg-cyan-500',
    label: 'Platinum'
  }
};

const UserBadge = ({ username, tier = 'bronze', className }) => {
  const { color, label } = tierConfig[tier] || tierConfig.bronze;
  
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-medium text-slate-900">{username}</span>
      <span 
        className={cn(
          "px-1.5 py-0.5 rounded text-xs font-medium text-white",
          color
        )}
        title={`${label} tier member`}
      >
        {label}
      </span>
    </div>
  );
};

export default UserBadge;