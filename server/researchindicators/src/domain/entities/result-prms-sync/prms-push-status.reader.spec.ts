import { PUSH_EVENTS_SQL } from './prms-push-status.reader';

describe('PUSH_EVENTS_SQL', () => {
  it('selects history with flat ANDs and orders by id alone', () => {
    expect(PUSH_EVENTS_SQL).not.toContain('result_status_id');
    expect(PUSH_EVENTS_SQL).not.toContain('is_synced_to_prms');
    expect(PUSH_EVENTS_SQL).not.toContain('result_prms_sync_log');
    expect(PUSH_EVENTS_SQL).not.toMatch(/\bOR\b/);

    const orderBy = PUSH_EVENTS_SQL.slice(PUSH_EVENTS_SQL.search(/ORDER BY/i));
    expect(orderBy).not.toMatch(/occurred_at|decided_at/);
    expect(orderBy).not.toMatch(/imported/);
    expect(orderBy).toMatch(/ORDER BY\s+h\.id\s+ASC\s*$/);
  });
});
