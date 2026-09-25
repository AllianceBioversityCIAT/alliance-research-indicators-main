import { PrmsSyncOutcome } from './prms-sync-outcome.enum';

describe('PrmsSyncOutcome', () => {
  it('holds exactly the eight design.md §5.4 members', () => {
    expect(PrmsSyncOutcome).toEqual({
      IN_FLIGHT: 'IN_FLIGHT',
      ACCEPTED: 'ACCEPTED',
      REJECTED_BY_PRMS: 'REJECTED_BY_PRMS',
      AUTH_FAILED: 'AUTH_FAILED',
      RETRYABLE: 'RETRYABLE',
      TRANSPORT_FAILED: 'TRANSPORT_FAILED',
      UNKNOWN: 'UNKNOWN',
      REFUSED_BY_STAR: 'REFUSED_BY_STAR',
    });
  });
});
