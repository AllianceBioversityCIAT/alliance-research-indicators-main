import { isPortfolio2025LeverName, isPortfolio2026SdgTargetCode, PORTFOLIO_2026_SDG_TARGET_CODES } from './portfolio-2026-sdg-targets';

describe('portfolio-2026-sdg-targets', () => {
  it('recognises configured codes only', () => {
    expect(PORTFOLIO_2026_SDG_TARGET_CODES.length).toBe(14);
    expect(isPortfolio2026SdgTargetCode('13.2')).toBe(true);
    expect(isPortfolio2026SdgTargetCode('9.9')).toBe(false);
    expect(isPortfolio2026SdgTargetCode(null)).toBe(false);
    expect(isPortfolio2026SdgTargetCode(undefined)).toBe(false);
  });

  it('detects portfolio 2025 lever names', () => {
    expect(isPortfolio2025LeverName('Lever 3')).toBe(true);
    expect(isPortfolio2025LeverName('  lever 12 x')).toBe(true);
    expect(isPortfolio2025LeverName('Other')).toBe(true);
    expect(isPortfolio2025LeverName('Research Area')).toBe(false);
    expect(isPortfolio2025LeverName(null)).toBe(false);
    expect(isPortfolio2025LeverName(undefined)).toBe(false);
  });
});
