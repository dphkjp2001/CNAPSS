import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 * Uses clsx for conditional class joining and tailwind-merge to resolve conflicts
 */
export const cn = (...classes) => {
  return twMerge(clsx(...classes));
};