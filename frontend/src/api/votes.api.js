import { postJson, getJson } from './http';

const baseUrl = '/votes';

/**
 * Vote API client
 */
export const voteApi = {
  /**
   * Cast a vote for content
   * @param {Object} params Vote parameters 
   * @param {string} params.targetType "Post" or "Comment"
   * @param {string} params.targetId ID of target content
   * @param {number} params.value Vote value (-1, 0, or 1)
   */
  async vote({ targetType, targetId, value }) {
    return postJson(`${baseUrl}/${targetType}/${targetId}`, { value });
  },

  /**
   * Get votes for multiple targets
   * @param {Object} params Query parameters
   * @param {string} params.targetType "Post" or "Comment" 
   * @param {string[]} params.targetIds Array of target IDs
   */
  async getVotesForTargets({ targetType, targetIds }) {
    // Build ?targetIds[]=id1&targetIds[]=id2&targetIds[]=id3
    const params = new URLSearchParams();
    targetIds.forEach(id => params.append("targetIds", id));
    return getJson(`${baseUrl}/${targetType}?${params.toString()}`);
  }
};