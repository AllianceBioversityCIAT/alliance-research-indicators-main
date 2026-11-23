import { SystemOrgStructureClock } from './org-structure.clock';

describe('SystemOrgStructureClock', () => {
  afterEach(() => jest.useRealTimers());

  it('returns the UTC calendar year', () => {
    jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:30:00Z'));
    expect(new SystemOrgStructureClock().currentYear()).toBe(2027);
  });

  it('does not roll over on local time: 31 Dec 23:30 UTC is still the old year', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-12-31T23:30:00Z'));
    expect(new SystemOrgStructureClock().currentYear()).toBe(2026);
  });
});
