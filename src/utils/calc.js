/**
 * Brzycki 1RM formula
 * @param {number} weight - Weight lifted
 * @param {number} reps - Number of reps
 * @returns {number} Estimated 1RM
 */
export function calc1RM(weight, reps) {
  if (!weight || weight <= 0 || !reps || reps <= 0 || reps > 30) return 0;
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}
