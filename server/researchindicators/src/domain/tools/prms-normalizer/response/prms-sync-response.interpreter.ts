import { PrmsSyncOutcome } from '../enum/prms-sync-outcome.enum';
import { PrmsNormalizerTransportResponseDto } from '../dto/prms-normalizer.dto';

export const PRMS_RESULT_CODE_ABSENT =
  'PRMS result code not present in ingest response';

export interface PrmsSyncInterpretation {
  outcome: PrmsSyncOutcome;
  httpStatus: number | null;
  requestId: string | null;
  responseBody: Record<string, unknown> | null;
  failureReason: string | null;
  prmsResultCode: number | null;
  /** PRMS reporting phase of the accepted row. Null on any non-ACCEPTED outcome. */
  prmsPhaseId: number | null;
}

const DOWNSTREAM_5XX = /HTTP\s+(5\d{2})\b/i;

/**
 * Maps the transport tri-state onto the outcome vocabulary (design.md §5.3).
 *
 * T-12 owns this parser. A mocked 207 proves the mapping against the
 * assumed shape; it does not close live-TEST coverage.
 */
export function interpretPrmsSyncResponse(
  transport: PrmsNormalizerTransportResponseDto | null,
  externalReference: string | null,
): PrmsSyncInterpretation {
  if (transport == null) {
    return {
      outcome: PrmsSyncOutcome.TRANSPORT_FAILED,
      httpStatus: null,
      requestId: null,
      responseBody: null,
      failureReason: 'PRMS Normalizer returned no HTTP response',
      prmsResultCode: null,
      prmsPhaseId: null,
    };
  }

  const body = (transport.body ?? {}) as Record<string, unknown>;
  const requestId = typeof body.requestId === 'string' ? body.requestId : null;
  const base = {
    httpStatus: transport.status,
    requestId,
    responseBody: body,
    prmsResultCode: null as number | null,
    prmsPhaseId: null as number | null,
  };

  if (transport.status === 401) {
    return {
      ...base,
      outcome: PrmsSyncOutcome.AUTH_FAILED,
      failureReason: 'PRMS Normalizer HTTP 401',
    };
  }

  if (transport.status === 503) {
    return {
      ...base,
      outcome: PrmsSyncOutcome.RETRYABLE,
      failureReason: 'PRMS Normalizer HTTP 503',
    };
  }

  if (transport.status === 422) {
    return {
      ...base,
      outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
      failureReason: reasonFromRejected(body, externalReference),
    };
  }

  if (transport.status >= 200 && transport.status < 300) {
    return interpretPerRow(body, externalReference, base);
  }

  return {
    ...base,
    outcome: PrmsSyncOutcome.RETRYABLE,
    failureReason: `PRMS Normalizer HTTP ${transport.status}`,
  };
}

function interpretPerRow(
  body: Record<string, unknown>,
  externalReference: string | null,
  base: {
    httpStatus: number;
    requestId: string | null;
    responseBody: Record<string, unknown>;
    prmsResultCode: number | null;
    prmsPhaseId: number | null;
  },
): PrmsSyncInterpretation {
  const results = Array.isArray(body.results) ? body.results : [];
  const row = results.find(
    (item) => rowExternalReference(item) === externalReference,
  );

  if (!isRecord(row)) {
    return {
      ...base,
      outcome: PrmsSyncOutcome.RETRYABLE,
      failureReason:
        'PRMS ingest response did not contain our external_reference',
    };
  }

  if (row.success === true) {
    const prmsResultCode = readResultCode(row);
    return {
      ...base,
      outcome: PrmsSyncOutcome.ACCEPTED,
      prmsResultCode,
      // Absent phase is NOT a failure: a sync that PRMS accepted stays ACCEPTED
      // and simply stores null. Only the result code carries PRMS_RESULT_CODE_ABSENT.
      prmsPhaseId: readPhaseId(row),
      failureReason: prmsResultCode == null ? PRMS_RESULT_CODE_ABSENT : null,
    };
  }

  const failureReason = stringifyError(row.error);
  if (isDownstream5xx(failureReason)) {
    return {
      ...base,
      outcome: PrmsSyncOutcome.RETRYABLE,
      failureReason,
    };
  }

  return {
    ...base,
    outcome: PrmsSyncOutcome.REJECTED_BY_PRMS,
    failureReason,
  };
}

function reasonFromRejected(
  body: Record<string, unknown>,
  externalReference: string | null,
): string {
  const rejected = Array.isArray(body.rejected) ? body.rejected : [];
  const match = rejected.find(
    (item) =>
      isRecord(item) &&
      typeof item.external_reference === 'string' &&
      item.external_reference === externalReference,
  );
  const chosen = match ?? rejected[0];
  if (typeof chosen === 'string') {
    return chosen;
  }
  if (isRecord(chosen)) {
    if (typeof chosen.reason === 'string') {
      return chosen.reason;
    }
    if (typeof chosen.message === 'string') {
      return chosen.message;
    }
    return JSON.stringify(chosen);
  }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors.map(String).join('; ');
  }
  return 'PRMS Normalizer HTTP 422';
}

function rowExternalReference(row: unknown): string | null {
  if (!isRecord(row)) {
    return null;
  }
  if (typeof row.external_reference === 'string') {
    return row.external_reference;
  }
  if (isRecord(row.result)) {
    if (typeof row.result.external_reference === 'string') {
      return row.result.external_reference;
    }
    if (
      isRecord(row.result.data) &&
      typeof row.result.data.external_reference === 'string'
    ) {
      return row.result.data.external_reference;
    }
  }
  return null;
}

function readResultCode(row: Record<string, unknown>): number | null {
  if (!isRecord(row.result)) {
    return null;
  }
  const code = row.result.result_code;
  if (typeof code === 'number' && Number.isFinite(code)) {
    return code;
  }
  if (typeof code === 'string' && code.trim() !== '') {
    const parsed = Number(code);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * PRMS reporting phase of the accepted row.
 *
 * ## Where it actually lives (CORRECTED 2026-09-23)
 *
 * The phase is sent by the PRMS backend that the Normalizer forwards to, so it
 * lands in the row's `externalApiResponse.response` -- NOT in `result`, which is
 * the Normalizer's echo of what WE submitted plus the assigned `result_code`.
 * Inside `response` PRMS sends the same value twice: `version_id` flat and
 * `obj_version.id` nested; `version_id` wins and `obj_version.id` is the fallback.
 *
 * `obj_version` also carries `phase_name` / `phase_year`, deliberately NOT stored
 * -- the year is already ours (MAPPABLE_LIVE_VERSION) and a second copy could drift.
 *
 * ## Why this was wrong before
 *
 * The original implementation read `result.version_id` / `result.obj_version.id`.
 * Neither key exists there in ANY captured response: all five spike fixtures under
 * `docs/specs/bilateral/prms-sync/sync-engine/spike/responses/` carry the phase at
 * `externalApiResponse.response.version_id` and nothing at `result.version_id`.
 * So `readPhaseId` returned null on every accepted sync since it was written, and
 * `results.prms_phase_id` was NULL for 17 of 17 synced results while
 * `prms_result_code` -- which genuinely does live at `result.result_code` -- stored
 * fine. The unit tests missed it because they hand-built a `result` object with a
 * `version_id` key instead of replaying a captured payload (KZ-017: the check was
 * narrower than the claim, and green).
 *
 * `result.*` is kept as a trailing fallback: costless, and it keeps the reader
 * working if PRMS ever hoists the field up to the echoed row.
 */
function readPhaseId(row: Record<string, unknown>): number | null {
  const sources: unknown[] = [];

  if (isRecord(row.externalApiResponse)) {
    sources.push(row.externalApiResponse.response);
  }
  sources.push(row.result);

  for (const source of sources) {
    const phase = readPhaseFrom(source);
    if (phase != null) {
      return phase;
    }
  }
  return null;
}

/** `version_id` first, nested `obj_version.id` second, within one container. */
function readPhaseFrom(source: unknown): number | null {
  if (!isRecord(source)) {
    return null;
  }
  const direct = toFiniteNumber(source.version_id);
  if (direct != null) {
    return direct;
  }
  if (isRecord(source.obj_version)) {
    return toFiniteNumber(source.obj_version.id);
  }
  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringifyError(error: unknown): string {
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  if (error == null) {
    return 'PRMS ingest row was not in the accepted set';
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'PRMS ingest row was not in the accepted set';
  }
}

function isDownstream5xx(errorText: string): boolean {
  return DOWNSTREAM_5XX.test(errorText);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}
