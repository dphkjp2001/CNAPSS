/**
 * Calculate Reddit-style hot ranking score
 * @param {number} ups - Number of upvotes
 * @param {number} downs - Number of downvotes
 * @param {Date|string|number} date - Creation date of the content
 * @returns {number} Hot score rounded to 7 decimal places
 */
function calculateHotScore(ups, downs, date) {
  const score = ups - downs;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const seconds = (new Date(date).getTime() / 1000) - 1134028003;
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  return +(order + sign * seconds / 45000).toFixed(7);
}

/**
 * Calculate user's tier based on net upvotes
 * @param {number} netUpvotes - User's net upvote count
 * @returns {string} User tier
 */
function calculateTier(netUpvotes) {
  if (netUpvotes >= 1000) return "Diamond";
  if (netUpvotes >= 300) return "Platinum";
  if (netUpvotes >= 100) return "Gold";
  if (netUpvotes >= 20) return "Silver";
  return "Bronze";
}

/**
 * Calculate vote transition delta
 * @param {number|null} oldValue - Previous vote value (-1, 0, 1, or null)
 * @param {number} newValue - New vote value (-1, 0, 1)
 * @returns {{ up: number, down: number }} Changes to apply to counts
 */
function calculateVoteDelta(oldValue, newValue) {
  const old = oldValue || 0;
  return {
    up: (newValue === 1 ? 1 : 0) - (old === 1 ? 1 : 0),
    down: (newValue === -1 ? 1 : 0) - (old === -1 ? 1 : 0)
  };
}

module.exports = {
  calculateHotScore,
  calculateTier,
  calculateVoteDelta
};