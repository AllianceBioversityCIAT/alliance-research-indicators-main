/**
 * The AI services report `similarity_score` on two scales: some payloads send a
 * percentage ("85"), others a fraction (0.92). Callers compare against a 0–100
 * threshold, and `parseInt('0.92')` is 0, so a near-certain match used to be
 * filed as "pending" and never saved (H47). A value of 1 or less is read as a
 * fraction.
 */
export function normalizeSimilarityScore(
  score: string | number | null | undefined,
): number {
  const value = typeof score === 'number' ? score : parseFloat(score ?? '');
  if (!Number.isFinite(value)) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
}
