import {
  isHomeEntryFromUrl,
  isKnownResultEntrySource,
  isPfmMonitorEntryFromUrl,
  isResultsCenterEntryFromUrl,
  RESULT_ENTRY_SOURCE_VALUE_PFM_MONITOR
} from './result-entry-source';

describe('result-entry-source', () => {
  it('pfm-monitor value is the literal used in the query string', () => {
    expect(RESULT_ENTRY_SOURCE_VALUE_PFM_MONITOR).toBe('pfm-monitor');
  });

  it('isPfmMonitorEntryFromUrl matches only from=pfm-monitor', () => {
    expect(isPfmMonitorEntryFromUrl('/result/STAR-1?from=pfm-monitor')).toBe(true);
    expect(isPfmMonitorEntryFromUrl('/result/STAR-1/general-information?version=2025&from=pfm-monitor')).toBe(true);
    expect(isPfmMonitorEntryFromUrl('/result/STAR-1?from=results-center')).toBe(false);
    expect(isPfmMonitorEntryFromUrl('/result/STAR-1?from=home')).toBe(false);
    expect(isPfmMonitorEntryFromUrl('/result/STAR-1')).toBe(false);
  });

  it('other entry predicates do not match pfm-monitor', () => {
    expect(isResultsCenterEntryFromUrl('/result/STAR-1?from=pfm-monitor')).toBe(false);
    expect(isHomeEntryFromUrl('/result/STAR-1?from=pfm-monitor')).toBe(false);
  });

  it('isKnownResultEntrySource accepts the three sources only', () => {
    expect(isKnownResultEntrySource('pfm-monitor')).toBe(true);
    expect(isKnownResultEntrySource('results-center')).toBe(true);
    expect(isKnownResultEntrySource('home')).toBe(true);
    expect(isKnownResultEntrySource('other')).toBe(false);
    expect(isKnownResultEntrySource(null)).toBe(false);
  });
});
