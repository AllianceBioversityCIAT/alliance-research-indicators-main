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
  });
});
