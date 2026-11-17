import { PFM_RETURN_STATE_TTL_MS, resultCodeFromUrl, savePfmReturnState, takePfmReturnState } from './pfm-return-state';

const STATE = {
  scope: 'mine' as const,
  tab: 'queue' as const,
  filters: { project: null, sp: null, type: null },
  chip: null,
  openGroups: ['A1080'],
  groupViews: { A1080: { first: 10, rows: 10, search: '', sortField: null, sortOrder: 1 as const } },
  resultCode: 'STAR-629'
};

describe('pfm-return-state', () => {
  beforeEach(() => sessionStorage.clear());

  it('is read once: the second read finds nothing', () => {
    savePfmReturnState(STATE, 1000);
    expect(takePfmReturnState(1000)).toEqual({ ...STATE, v: 1, savedAt: 1000 });
    expect(takePfmReturnState(1000)).toBeNull();
  });

  it('an old snapshot is ignored (the user did something else in between)', () => {
    savePfmReturnState(STATE, 0);
    expect(takePfmReturnState(PFM_RETURN_STATE_TTL_MS + 1)).toBeNull();
  });

  it('broken or foreign content is ignored, never thrown', () => {
    sessionStorage.setItem('pfm-monitor-return-state', '{not json');
    expect(takePfmReturnState()).toBeNull();
    sessionStorage.setItem('pfm-monitor-return-state', JSON.stringify({ v: 99 }));
    expect(takePfmReturnState()).toBeNull();
  });

  it('takes the result code from a result URL', () => {
    expect(resultCodeFromUrl('/result/STAR-629/general-information?from=pfm-monitor')).toBe('STAR-629');
    expect(resultCodeFromUrl('/result/TIP-12?from=pfm-monitor&version=2025')).toBe('TIP-12');
    expect(resultCodeFromUrl('/results-center')).toBeNull();
  });
});
