import { readFileSync } from 'fs';
import { resolve } from 'path';

import { PrmsSyncOutcome } from '../enum/prms-sync-outcome.enum';
import {
  PRMS_RESULT_CODE_ABSENT,
  interpretPrmsSyncResponse,
} from './prms-sync-response.interpreter';

const OURS = 'ARI-1001';

describe('interpretPrmsSyncResponse', () => {
  it('maps a null transport to TRANSPORT_FAILED', () => {
    const interpreted = interpretPrmsSyncResponse(null, OURS);

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.TRANSPORT_FAILED);
    expect(interpreted.httpStatus).toBeNull();
    expect(interpreted.requestId).toBeNull();
    expect(interpreted.prmsResultCode).toBeNull();
  });

  it('maps HTTP 401 to AUTH_FAILED and persists requestId', () => {
    const interpreted = interpretPrmsSyncResponse(
      {
        status: 401,
        body: { requestId: 'Root=auth-1', message: 'Unauthorized' },
      },
      OURS,
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.AUTH_FAILED);
    expect(interpreted.requestId).toBe('Root=auth-1');
    expect(interpreted.httpStatus).toBe(401);
    expect(interpreted.prmsResultCode).toBeNull();
  });

  it('maps HTTP 503 to RETRYABLE and persists requestId', () => {
    const interpreted = interpretPrmsSyncResponse(
      {
        status: 503,
        body: { requestId: 'Root=svc-1', message: 'Service Unavailable' },
      },
      OURS,
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.RETRYABLE);
    expect(interpreted.requestId).toBe('Root=svc-1');
    expect(interpreted.httpStatus).toBe(503);
  });

  it('maps HTTP 422 to REJECTED_BY_PRMS using rejected[] for the matching row', () => {
    const body = {
      requestId: 'Root=unprocessable-1',
      rejected: [
        { external_reference: 'ARI-OTHER', reason: 'other row' },
        { external_reference: OURS, reason: 'invalid title' },
      ],
    };

    const interpreted = interpretPrmsSyncResponse({ status: 422, body }, OURS);

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(interpreted.failureReason).toBe('invalid title');
    expect(interpreted.requestId).toBe('Root=unprocessable-1');
    expect(interpreted.responseBody).toEqual(body);
  });

  /**
   * K-004 failing input: ours is SECOND and failed. An index-based lookup
   * reads the first row, sees success, and reports ACCEPTED with that
   * row's result_code.
   */
  it('does not accept a 207 whose matching external_reference row failed even when an earlier results[] row succeeded', () => {
    const body = {
      requestId: 'Root=two-row',
      results: [
        {
          success: true,
          external_reference: 'ARI-OTHER',
          result: { result_code: 1111 },
        },
        {
          success: false,
          external_reference: OURS,
          error: 'Evidence link is not a valid URL',
          resultId:
            'prms.result-management.api:capacity_sharing:dataset.ingest.requested:auto-deadbeef',
        },
      ],
    };

    const interpreted = interpretPrmsSyncResponse({ status: 207, body }, OURS);

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(interpreted.outcome).not.toBe(PrmsSyncOutcome.ACCEPTED);
    expect(interpreted.prmsResultCode).not.toBe(1111);
    expect(interpreted.prmsResultCode).toBeNull();
    expect(interpreted.failureReason).toBe('Evidence link is not a valid URL');
    expect(interpreted.responseBody).toEqual(body);
    expect(interpreted.requestId).toBe('Root=two-row');
  });

  it('classifies a 207 row whose error is a downstream 5xx as RETRYABLE', () => {
    const interpreted = interpretPrmsSyncResponse(
      {
        status: 207,
        body: {
          requestId: 'Root=dd18-5xx',
          results: [
            {
              success: false,
              external_reference: OURS,
              error: 'HTTP 502: Proxy Error',
            },
          ],
        },
      },
      OURS,
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.RETRYABLE);
    expect(interpreted.failureReason).toBe('HTTP 502: Proxy Error');
    expect(interpreted.requestId).toBe('Root=dd18-5xx');
  });

  it('reads the PRMS result code from results[].result.result_code and not from resultId', () => {
    const interpreted = interpretPrmsSyncResponse(
      {
        status: 200,
        body: {
          requestId: 'Root=code-1',
          results: [
            {
              success: true,
              external_reference: OURS,
              resultId:
                'prms.result-management.api:capacity_sharing:dataset.ingest.requested:auto-deadbeef',
              result: { result_code: 9199, result_id: 11667 },
            },
          ],
        },
      },
      OURS,
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(interpreted.prmsResultCode).toBe(9199);
    expect(interpreted.failureReason).toBeNull();
  });

  // --- PRMS reporting phase -------------------------------------------------
  // CORRECTED 2026-09-23. The phase comes from the PRMS backend that the
  // Normalizer forwards to, so it arrives in the row's `externalApiResponse.
  // response` -- NOT in `result`, which is the Normalizer's echo of our own
  // submission plus the assigned `result_code`. Inside `response` the value is
  // sent twice: `version_id` flat and `obj_version.id` nested.
  //
  // The tests this block replaces asserted against a hand-built `result` object
  // carrying a `version_id` key. No PRMS response has ever contained that key, so
  // six tests passed over a payload shape that does not exist while the real
  // reader returned null on every accepted sync (KZ-017). `replays a captured
  // PRMS response` below is the guard against that recurring: it reads a
  // committed spike capture off disk rather than trusting a shape typed here.

  const acceptedWith = (response: Record<string, unknown>) =>
    interpretPrmsSyncResponse(
      {
        status: 200,
        body: {
          requestId: 'Root=phase-1',
          results: [
            {
              success: true,
              external_reference: OURS,
              result: { result_code: 9427 },
              externalApiResponse: { path: '/api/bilateral/create', response },
            },
          ],
        },
      },
      OURS,
    );

  it('reads the phase from externalApiResponse.response.version_id', () => {
    const interpreted = acceptedWith({
      result_code: '9427',
      version_id: '36',
      obj_version: { id: '36', phase_name: 'Reporting 2026', phase_year: 2026 },
    });

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(interpreted.prmsPhaseId).toBe(36);
  });

  it('falls back to obj_version.id when version_id is absent', () => {
    const interpreted = acceptedWith({
      obj_version: { id: '36', phase_name: 'Reporting 2026', phase_year: 2026 },
    });

    expect(interpreted.prmsPhaseId).toBe(36);
  });

  it('prefers version_id over obj_version.id when the two disagree', () => {
    // They are the same value in every response seen so far. Pinning the
    // precedence means a future divergence resolves the same way every time
    // instead of depending on object key order.
    const interpreted = acceptedWith({
      version_id: '36',
      obj_version: { id: '99' },
    });

    expect(interpreted.prmsPhaseId).toBe(36);
  });

  it('parses a phase sent as a numeric string', () => {
    // PRMS quotes it: `"version_id": "36"`, not 36.
    expect(acceptedWith({ version_id: '36' }).prmsPhaseId).toBe(36);
  });

  it('still reads a phase hoisted onto the echoed result row', () => {
    // Trailing fallback: costless, and it keeps the reader working if PRMS ever
    // moves the field up. No captured response uses this path today.
    const interpreted = interpretPrmsSyncResponse(
      {
        status: 200,
        body: {
          requestId: 'Root=phase-hoisted',
          results: [
            {
              success: true,
              external_reference: OURS,
              result: { result_code: 9427, version_id: '36' },
            },
          ],
        },
      },
      OURS,
    );

    expect(interpreted.prmsPhaseId).toBe(36);
  });

  it('leaves the phase null when neither source is present, WITHOUT failing the sync', () => {
    const interpreted = acceptedWith({ result_code: '9427' });

    expect(interpreted.prmsPhaseId).toBeNull();
    // An absent phase must not degrade an accepted sync: only the result code
    // carries a failureReason when missing.
    expect(interpreted.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(interpreted.failureReason).toBeNull();
  });

  it('replays a captured PRMS response and reads BOTH the result code and the phase', () => {
    // Anti-fabrication guard. This payload is not typed here: it is the verbatim
    // capture committed at
    // docs/specs/bilateral/prms-sync/sync-engine/spike/responses/, so the test
    // cannot drift from what PRMS actually sends the way its predecessor did.
    const capturePath = resolve(
      __dirname,
      '../../../../../../../docs/specs/bilateral/prms-sync/sync-engine/spike/responses/01-capacity-sharing-scope50.json',
    );
    const body = JSON.parse(readFileSync(capturePath, 'utf-8')) as Record<
      string,
      unknown
    >;

    const interpreted = interpretPrmsSyncResponse(
      { status: 200, body },
      'ARI-SPIKE-20260914-01',
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(interpreted.prmsResultCode).toBe(9199);
    expect(interpreted.prmsPhaseId).toBe(36);
    expect(interpreted.failureReason).toBeNull();
  });

  it('leaves the phase null on a non-accepted outcome', () => {
    const interpreted = interpretPrmsSyncResponse(
      { status: 422, body: { requestId: 'Root=phase-2' } },
      OURS,
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.REJECTED_BY_PRMS);
    expect(interpreted.prmsPhaseId).toBeNull();
  });

  it('records that no PRMS result code is present instead of leaving a silent null', () => {
    const interpreted = interpretPrmsSyncResponse(
      {
        status: 200,
        body: {
          requestId: 'Root=no-code',
          results: [
            {
              success: true,
              external_reference: OURS,
              resultId:
                'prms.result-management.api:capacity_sharing:dataset.ingest.requested:auto-deadbeef',
              result: { result_id: 11667 },
            },
          ],
        },
      },
      OURS,
    );

    expect(interpreted.outcome).toBe(PrmsSyncOutcome.ACCEPTED);
    expect(interpreted.prmsResultCode).toBeNull();
    expect(interpreted.failureReason).toBe(PRMS_RESULT_CODE_ABSENT);
  });
});
