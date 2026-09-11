import { VISUAL_ONLY_GREEN_CHECKS } from './find-green-checks.dto';

describe('VISUAL_ONLY_GREEN_CHECKS', () => {
  it('does not contain innovation_use (T-11 — R-IU-007 AC.3)', () => {
    // innovation_use must gate submission (completenessValidation ANDs
    // every key NOT in this set). Adding it here would silently make the
    // Innovation Use section non-blocking, the exact inverse of the
    // requirement.
    expect(VISUAL_ONLY_GREEN_CHECKS.has('innovation_use')).toBe(false);
  });

  it('still contains the pre-existing pool_funding_alignment entry', () => {
    expect(VISUAL_ONLY_GREEN_CHECKS.has('pool_funding_alignment')).toBe(true);
  });
});
