import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PrmsSyncOutcome } from '../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import {
  deriveSyncState,
  mapLastAttempt,
  ResultPrmsSyncStatusReader,
} from './result-prms-sync-status.reader';

describe('ResultPrmsSyncStatusReader', () => {
  const query = jest.fn();
  const reader = new ResultPrmsSyncStatusReader({
    query,
  } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue([]);
  });

  describe('mapLastAttempt', () => {
    it('copies the safe last-attempt fields and drops request_payload', () => {
      const mapped = mapLastAttempt({
        attempt_number: '3',
        outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
        http_status: 422,
        request_id: 'req-1',
        failure_reason: 'bad evidence',
        environment: 'TEST',
        prms_type: 'capacity_sharing',
        created_at: '2026-09-15T00:00:00.000Z',
        request_payload: { 'x-api-key': 'secret', api_key: 'secret' },
        response_body: { requestId: 'req-1' },
      });

      expect(mapped).toEqual({
        attempt_number: 3,
        outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
        http_status: 422,
        request_id: 'req-1',
        failure_reason: 'bad evidence',
        environment: 'TEST',
        prms_type: 'capacity_sharing',
        created_at: '2026-09-15T00:00:00.000Z',
      });
      expect(mapped).not.toHaveProperty('request_payload');
      expect(JSON.stringify(mapped)).not.toContain('secret');
    });

    it('returns null when there is no attempt row', () => {
      expect(mapLastAttempt(undefined)).toBeNull();
      expect(mapLastAttempt(null)).toBeNull();
    });
  });

  describe('deriveSyncState', () => {
    it('returns synced when the result flag is set', () => {
      expect(deriveSyncState(true, null)).toBe('synced');
    });

    it('returns never_synced with no attempts or an in-flight claim', () => {
      expect(deriveSyncState(false, null)).toBe('never_synced');
      expect(
        deriveSyncState(false, {
          attempt_number: 1,
          outcome: PrmsSyncOutcome.IN_FLIGHT,
          http_status: null,
          request_id: null,
          failure_reason: null,
          environment: 'TEST',
          prms_type: null,
          created_at: '2026-09-15T00:00:00.000Z',
        }),
      ).toBe('never_synced');
    });

    it('returns failed for a terminal unsuccessful attempt', () => {
      expect(
        deriveSyncState(false, {
          attempt_number: 2,
          outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
          http_status: 422,
          request_id: 'req-2',
          failure_reason: 'bad row',
          environment: 'TEST',
          prms_type: 'policy_change',
          created_at: '2026-09-15T00:00:00.000Z',
        }),
      ).toBe('failed');
    });
  });

  it('throws 404 when the result does not exist', async () => {
    query.mockResolvedValueOnce([]);

    await expect(reader.getStatus(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('never selects request_payload and never returns it', async () => {
    query
      .mockResolvedValueOnce([{ is_synced_to_prms: 0, prms_result_code: null }])
      .mockResolvedValueOnce([
        {
          attempt_number: 1,
          outcome: PrmsSyncOutcome.TRANSPORT_FAILED,
          http_status: null,
          request_id: null,
          failure_reason: 'PRMS Normalizer returned no HTTP response',
          environment: 'TEST',
          prms_type: 'capacity_sharing',
          created_at: '2026-09-15T00:00:00.000Z',
          request_payload: { api_key: 'should-not-leak' },
        },
      ]);

    const status = await reader.getStatus(42);

    expect(query.mock.calls[0][0]).not.toMatch(/request_payload/);
    expect(query.mock.calls[1][0]).not.toMatch(/request_payload/);
    expect(status).not.toHaveProperty('request_payload');
    expect(status.last_attempt).not.toHaveProperty('request_payload');
    expect(JSON.stringify(status)).not.toContain('should-not-leak');
    expect(status.sync_state).toBe('failed');
    expect(status.is_synced_to_prms).toBe(false);
    expect(status).toHaveProperty('last_decision');
    expect(status.last_decision).toBeNull();
  });

  it('keeps sync_state and last_attempt byte-identical to the pre-change baseline', async () => {
    // Captured against the unmodified reader (HEAD 6540e33f, 8 tests green)
    // before last_decision existed. The mock answers by table, so routing
    // last_attempt at prms_webhook_delivery returns a verdict row and this
    // comparison goes red. The two fields are asserted on their own.
    const baselineLastAttempt = {
      attempt_number: 1,
      outcome: PrmsSyncOutcome.TRANSPORT_FAILED,
      http_status: null,
      request_id: null,
      failure_reason: 'PRMS Normalizer returned no HTTP response',
      environment: 'TEST',
      prms_type: 'capacity_sharing',
      created_at: '2026-09-15T00:00:00.000Z',
    };
    query.mockImplementation((sql: string) => {
      if (/result_prms_sync_log/.test(sql)) {
        return Promise.resolve([
          {
            ...baselineLastAttempt,
            request_payload: { api_key: 'should-not-leak' },
          },
        ]);
      }
      if (/prms_webhook_delivery/.test(sql)) {
        return Promise.resolve([
          {
            decision: 'REJECT',
            decided_at: '2026-09-20T15:30:00.000Z',
            justification: 'a verdict is not an attempt',
            prms_result_code: 77,
            received_at: '2026-09-20T15:30:04.000Z',
          },
        ]);
      }
      if (/FROM results/i.test(sql)) {
        return Promise.resolve([
          { is_synced_to_prms: 0, prms_result_code: null },
        ]);
      }
      return Promise.resolve([]);
    });

    const status = await reader.getStatus(42);

    expect(status.sync_state).toBe('failed');
    expect(status.last_attempt).toEqual(baselineLastAttempt);
    expect(status.last_attempt).not.toHaveProperty('request_payload');
  });

  it('reads the status of a version (snapshot) row — the results query does not constrain is_snapshot', async () => {
    // Versions are the approved rows PRMS receives; the GET surface must be able
    // to report on the same row the POST syncs.
    query
      .mockResolvedValueOnce([
        { is_synced_to_prms: 1, prms_result_code: 'PRMS-1' },
      ])
      .mockResolvedValueOnce([]);

    const status = await reader.getStatus(555);

    const resultsSql = query.mock.calls
      .map((call) => call[0] as string)
      .find((sql) => /FROM results/i.test(sql));
    expect(resultsSql).toBeDefined();
    expect(resultsSql).not.toMatch(/is_snapshot/i);
    expect(status.is_synced_to_prms).toBe(true);
    expect(status.sync_state).toBe('synced');
    expect(status.last_attempt).toBeNull();
    expect(status.last_decision).toBeNull();
  });

  it('returns APPROVE with decided_at and null justification', async () => {
    query.mockImplementation((sql: string) => {
      if (/prms_webhook_delivery/.test(sql)) {
        return Promise.resolve([
          {
            decision: 'APPROVE',
            decided_at: '2026-09-18T11:00:00.000Z',
            justification: null,
            prms_result_code: '9001',
            received_at: '2026-09-18T11:00:03.000Z',
          },
        ]);
      }
      if (/result_prms_sync_log/.test(sql)) {
        return Promise.resolve([]);
      }
      if (/FROM results/i.test(sql)) {
        return Promise.resolve([
          { is_synced_to_prms: 1, prms_result_code: 10 },
        ]);
      }
      return Promise.resolve([]);
    });

    const status = await reader.getStatus(42);

    expect(status.last_decision).toEqual({
      decision: 'APPROVE',
      decided_at: '2026-09-18T11:00:00.000Z',
      justification: null,
      prms_result_code: 9001,
      delivery_received_at: '2026-09-18T11:00:03.000Z',
    });
    const decisionSql = issuedSql(query).find((sql) =>
      /prms_webhook_delivery/.test(sql),
    );
    expect(decisionSql).toMatch(/correlation_outcome\s*=\s*'CORRELATED'/);
    expect(decisionSql).toMatch(/duplicate_of_id\s+IS\s+NULL/);
    expect(decisionSql).not.toMatch(/raw_body/);
  });

  it('returns REJECT justification verbatim and keeps the earlier decision in history', async () => {
    const earlier = {
      decision: 'APPROVE',
      decided_at: '2026-09-10T08:00:00.000Z',
      justification: null,
      prms_result_code: 11,
      received_at: '2026-09-10T08:00:02.000Z',
      correlation_outcome: 'CORRELATED',
      duplicate_of_id: null as number | null,
    };
    const later = {
      decision: 'REJECT',
      decided_at: '2026-09-20T15:30:00.000Z',
      justification: '  Evidence does not support the claim.\n',
      prms_result_code: null,
      received_at: '2026-09-20T15:30:04.000Z',
      correlation_outcome: 'CORRELATED',
      duplicate_of_id: null as number | null,
    };
    const duplicateNewer = {
      decision: 'REJECT',
      decided_at: '2026-09-21T00:00:00.000Z',
      justification: 'should-not-surface',
      prms_result_code: 99,
      received_at: '2026-09-21T00:00:01.000Z',
      correlation_outcome: 'DUPLICATE',
      duplicate_of_id: 5 as number | null,
    };
    const uncorrelatedNewer = {
      decision: 'REJECT',
      decided_at: '2026-09-22T00:00:00.000Z',
      justification: 'unknown-ref',
      prms_result_code: 3,
      received_at: '2026-09-22T00:00:01.000Z',
      correlation_outcome: 'UNKNOWN_REFERENCE',
      duplicate_of_id: null as number | null,
    };
    const history = [earlier, later, duplicateNewer, uncorrelatedNewer];
    const outbound = {
      attempt_number: 4,
      outcome: PrmsSyncOutcome.ACCEPTED,
      http_status: 200,
      request_id: 'req-out',
      failure_reason: null,
      environment: 'TEST',
      prms_type: 'innovation_use',
      created_at: '2026-09-01T00:00:00.000Z',
    };

    query.mockImplementation((sql: string) => {
      if (/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)) {
        history.length = 0;
        return Promise.resolve([]);
      }
      if (/result_prms_sync_log/.test(sql)) {
        return Promise.resolve([outbound]);
      }
      if (/prms_webhook_delivery/.test(sql)) {
        return Promise.resolve(projectDeliveries(sql, history));
      }
      if (/FROM results/i.test(sql)) {
        return Promise.resolve([
          { is_synced_to_prms: 1, prms_result_code: 10 },
        ]);
      }
      return Promise.resolve([]);
    });

    const status = await reader.getStatus(42);

    expect(status.last_decision).toEqual({
      decision: 'REJECT',
      decided_at: '2026-09-20T15:30:00.000Z',
      justification: '  Evidence does not support the claim.\n',
      prms_result_code: null,
      delivery_received_at: '2026-09-20T15:30:04.000Z',
    });
    expect(status.sync_state).toBe('synced');
    expect(status.last_attempt).toEqual(outbound);
    expect(history).toHaveLength(4);
    expect(history[0]).toBe(earlier);
    for (const [sql] of query.mock.calls) {
      expect(sql).toMatch(/^\s*SELECT\b/i);
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i);
    }
    expect(issuedSql(query).join('\n')).not.toMatch(/prms_phase_id/);
    const decisionCall = query.mock.calls.find((call) =>
      /prms_webhook_delivery/.test(call[0] as string),
    );
    expect(decisionCall?.[1]).toEqual([42]);
  });
});

function issuedSql(query: jest.Mock): string[] {
  return query.mock.calls.map((call) => call[0] as string);
}

function projectDeliveries(
  sql: string,
  history: Array<{
    decided_at: string;
    correlation_outcome: string;
    duplicate_of_id: number | null;
  }>,
) {
  let rows = history.slice();
  if (/correlation_outcome\s*=\s*'CORRELATED'/.test(sql)) {
    rows = rows.filter((row) => row.correlation_outcome === 'CORRELATED');
  }
  if (/duplicate_of_id\s+IS\s+NULL/i.test(sql)) {
    rows = rows.filter((row) => row.duplicate_of_id == null);
  }
  if (/ORDER BY\s+decided_at\s+DESC/i.test(sql)) {
    rows.sort((a, b) => (a.decided_at < b.decided_at ? 1 : -1));
  }
  if (/LIMIT\s+1/i.test(sql)) {
    rows = rows.slice(0, 1);
  }
  return rows;
}
