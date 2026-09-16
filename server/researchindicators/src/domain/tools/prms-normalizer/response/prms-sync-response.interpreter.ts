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
    };
  }

  const body = (transport.body ?? {}) as Record<string, unknown>;
  const requestId = typeof body.requestId === 'string' ? body.requestId : null;
  const base = {
    httpStatus: transport.status,
    requestId,
    responseBody: body,
    prmsResultCode: null as number | null,
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
