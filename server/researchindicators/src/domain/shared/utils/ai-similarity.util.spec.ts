import { normalizeSimilarityScore } from './ai-similarity.util';

describe('normalizeSimilarityScore', () => {
  it.each([
    ['85', 85],
    [85, 85],
    ['0.92', 92],
    [0.92, 92],
    [1, 100],
    ['70.6', 71],
  ])('reads %p as %p', (score, expected) => {
    expect(normalizeSimilarityScore(score)).toBe(expected);
  });

  it.each([null, undefined, '', 'n/a'])('reads %p as 0', (score) => {
    expect(normalizeSimilarityScore(score)).toBe(0);
  });
});
