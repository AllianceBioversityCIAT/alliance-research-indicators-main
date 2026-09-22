import { HttpStatus, Injectable } from '@nestjs/common';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ServiceResponseDto } from '../../shared/global-dto/service-response.dto';
import {
  DeliveryCorrelationResult,
  DeliveryCorrelatorService,
} from './delivery-correlator.service';
import { DeliveryCorrelationOutcome } from './enum/delivery-correlation-outcome.enum';
import {
  PrmsWebhookDeliveryRepository,
  RecordDeliveryResult,
} from './repositories/prms-webhook-delivery.repository';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-09 /
// R-PWH-003 AC.1–AC.4 · R-PWH-005 AC.3, AC.4, AC.5, AC.6 ·
// R-PWH-006 AC.3 · R-PWH-009 AC.4 · NFR-PWH-001, NFR-PWH-003, NFR-PWH-005 ·
// design §3.1, §6.3 steps 2, 4, 5, §10, DD-4, DC-6.

/**
 * What the callback edge (T-04) will hand this service. The secret lives
 * in the path and must already have been checked; it is not a field here
 * and is never logged (NFR-PWH-002).
 */
export interface AcceptPrmsDeliveryInput {
  /** Header `x-prms-delivery-id`, or null when PRMS omitted it. */
  deliveryId: string | null;
  /** Already-parsed JSON body. A non-object is a shape violation. */
  body: unknown;
  /**
   * Delivery-relevant headers. The path secret must not be among them —
   * this service stores the object it is given.
   */
  rawHeaders: Record<string, unknown> | null;
}

/**
 * Ingest can classify shape, absence of a reference, and nothing else.
 * `DUPLICATE` is the transaction's decision (T-05). `CORRELATED` is the
 * correlator's (T-06) and must not be claimed before that lookup: the
 * sync-status reader treats `CORRELATED` as a verdict, so a crash between
 * insert and the detached step would surface a decision that was never
 * resolved. A shape-valid body that carries a reference is therefore
 * stored as `UNKNOWN_REFERENCE` until `finish()` overwrites it.
 */
type IngestCorrelationOutcome = Exclude<
  DeliveryCorrelationOutcome,
  DeliveryCorrelationOutcome.DUPLICATE | DeliveryCorrelationOutcome.CORRELATED
>;

interface ClassifiedBody {
  correlationOutcome: IngestCorrelationOutcome;
  externalReference: string | null;
  prmsResultId: number | null;
  prmsResultCode: number | null;
  decision: string | null;
  justification: string | null;
  decidedAt: Date | null;
  rawBody: Record<string, unknown> | null;
}

interface DeliveryLogFields {
  deliveryId: string | null;
  environment: 'PROD' | 'TEST';
  correlationOutcome: DeliveryCorrelationOutcome;
  externalReference: string | null;
  officialCode: number | null;
}

const VERBATIM_DECISIONS = new Set(['APPROVE', 'REJECT']);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asSafeInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null;

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const emptyMalformed = (): ClassifiedBody => ({
  correlationOutcome: DeliveryCorrelationOutcome.MALFORMED,
  externalReference: null,
  prmsResultId: null,
  prmsResultCode: null,
  decision: null,
  justification: null,
  decidedAt: null,
  rawBody: null,
});

/**
 * Lenient parse (design §6.3 step 2). A shape violation is data: the
 * raw object is kept and the outcome is `MALFORMED`. Never throws.
 *
 * `decision` is `APPROVE` / `REJECT` verbatim, or null when the row is
 * `MALFORMED` (design §4). `justification` is the string PRMS sent, or
 * null when the key is absent or null — never `''` for an omission.
 */
const classifyBody = (body: unknown): ClassifiedBody => {
  if (!isPlainObject(body)) {
    return emptyMalformed();
  }

  const reference = readExternalReference(body);
  const justification = readJustification(body);
  const decidedAt = readDecidedAt(body);
  const decision = readDecision(body);
  const prmsResultId = readPrmsResultId(body);
  const data = readData(body);
  const prmsResultCode = data.ok ? readResultCode(data.value) : null;

  const shapeOk =
    reference.ok &&
    justification.ok &&
    decidedAt.ok &&
    decision.ok &&
    prmsResultId.ok &&
    data.ok;

  const parsed: Omit<ClassifiedBody, 'correlationOutcome' | 'decision'> = {
    externalReference: reference.value,
    prmsResultId: prmsResultId.value,
    prmsResultCode,
    justification: justification.value,
    decidedAt: decidedAt.value,
    rawBody: body,
  };

  if (!shapeOk) {
    return {
      ...parsed,
      correlationOutcome: DeliveryCorrelationOutcome.MALFORMED,
      decision: null,
    };
  }

  if (reference.value == null) {
    return {
      ...parsed,
      correlationOutcome: DeliveryCorrelationOutcome.NO_REFERENCE,
      decision: decision.value,
    };
  }

  return {
    ...parsed,
    correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
    decision: decision.value,
  };
};

const readExternalReference = (
  body: Record<string, unknown>,
): { ok: boolean; value: string | null } => {
  if (!('external_reference' in body) || body.external_reference == null) {
    return { ok: true, value: null };
  }
  if (typeof body.external_reference !== 'string') {
    return { ok: false, value: null };
  }
  return { ok: true, value: body.external_reference };
};

/**
 * Absent or null → null. A string, including `''`, is kept byte-identical.
 * The omission path is the one R-PWH-005 AC.5 forbids turning into `''`.
 */
const readJustification = (
  body: Record<string, unknown>,
): { ok: boolean; value: string | null } => {
  if (!('justification' in body) || body.justification == null) {
    return { ok: true, value: null };
  }
  if (typeof body.justification !== 'string') {
    return { ok: false, value: null };
  }
  return { ok: true, value: body.justification };
};

const readDecidedAt = (
  body: Record<string, unknown>,
): { ok: boolean; value: Date | null } => {
  const value = body.decided_at;
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, value: null };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, value: null };
  }
  return { ok: true, value: parsed };
};

const readDecision = (
  body: Record<string, unknown>,
): { ok: true; value: string } | { ok: false; value: null } => {
  if (
    typeof body.decision === 'string' &&
    VERBATIM_DECISIONS.has(body.decision)
  ) {
    return { ok: true, value: body.decision };
  }
  return { ok: false, value: null };
};

const readPrmsResultId = (
  body: Record<string, unknown>,
): { ok: boolean; value: number | null } => {
  const value = asSafeInteger(body.result_id);
  if (value === null) {
    return { ok: false, value: null };
  }
  return { ok: true, value };
};

const readData = (
  body: Record<string, unknown>,
): { ok: boolean; value: Record<string, unknown> | null } => {
  if (!('data' in body) || body.data == null) {
    return { ok: true, value: null };
  }
  if (!isPlainObject(body.data)) {
    return { ok: false, value: null };
  }
  return { ok: true, value: body.data };
};

const readResultCode = (
  data: Record<string, unknown> | null,
): number | null => {
  if (!data) {
    return null;
  }
  return asSafeInteger(data.result_code);
};

/**
 * Store-then-acknowledge (DD-4, DC-6). Steps that run before the `2xx`:
 * classify, stamp the environment, await the repository transaction.
 * The correlator is started afterwards and is not awaited.
 *
 * Does not own the transaction (design §3.1) and is not registered in
 * `PrmsWebhookModule` — its caller is T-04's controller, which does not
 * exist yet.
 */
@Injectable()
export class PrmsWebhookDeliveryService {
  private readonly logger = new LoggerUtil({
    name: PrmsWebhookDeliveryService.name,
  });

  constructor(
    private readonly repository: PrmsWebhookDeliveryRepository,
    private readonly correlator: DeliveryCorrelatorService,
    private readonly appConfig: AppConfig,
  ) {}

  async accept(
    input: AcceptPrmsDeliveryInput,
  ): Promise<ServiceResponseDto<{ received: true }>> {
    const classified = classifyBody(input.body);
    const environment = this.environmentLabel();

    const stored = await this.repository.recordDelivery({
      delivery_id: input.deliveryId,
      received_at: new Date(),
      environment,
      correlation_outcome: classified.correlationOutcome,
      external_reference: classified.externalReference,
      prms_result_id: classified.prmsResultId,
      prms_result_code: classified.prmsResultCode,
      decision: classified.decision,
      justification: classified.justification,
      decided_at: classified.decidedAt,
      raw_body: classified.rawBody,
      raw_headers: input.rawHeaders,
    });

    const logFields = this.logFields(
      input.deliveryId,
      environment,
      stored.kind === 'duplicate'
        ? DeliveryCorrelationOutcome.DUPLICATE
        : classified.correlationOutcome,
      classified.externalReference,
    );

    if (!this.shouldDetach(stored, classified.correlationOutcome)) {
      this.logDelivery(logFields);
      return this.acknowledgement();
    }

    const correlation = this.beginCorrelation(
      stored.deliveryRowId,
      input.deliveryId,
      classified.externalReference,
      logFields,
    );
    if (correlation) {
      // DC-6: this promise is observed, never awaited. Awaiting it makes
      // a deferred correlator hold the `2xx` past PRMS's 15s timeout.
      this.observeDetached(correlation, logFields);
    }
    return this.acknowledgement();
  }

  /**
   * `DUPLICATE` skips the detached step (design §6.3, R-PWH-006 AC.1).
   * `MALFORMED` skips it too: `DeliveryCorrelator.finish()` overwrites
   * `correlation_outcome` unconditionally and does not read the ingest
   * classification, so a malformed row with a reference would be
   * rewritten to `CORRELATED` and one without would become
   * `NO_REFERENCE`. T-09 owns which rows reach that step; the design
   * text only names `DUPLICATE`.
   */
  private shouldDetach(
    stored: RecordDeliveryResult,
    correlationOutcome: IngestCorrelationOutcome,
  ): stored is Extract<RecordDeliveryResult, { kind: 'recorded' }> {
    if (stored.kind === 'duplicate') {
      return false;
    }
    return correlationOutcome !== DeliveryCorrelationOutcome.MALFORMED;
  }

  private beginCorrelation(
    deliveryRowId: number,
    deliveryId: string | null,
    externalReference: string | null,
    logFields: DeliveryLogFields,
  ): Promise<DeliveryCorrelationResult> | null {
    try {
      return Promise.resolve(
        this.correlator.correlate({
          id: deliveryRowId,
          delivery_id: deliveryId,
          external_reference: externalReference,
        }),
      );
    } catch (error) {
      this.logPostAcknowledgementFailure(deliveryId, error);
      this.logDelivery(logFields);
      return null;
    }
  }

  private observeDetached(
    correlation: Promise<DeliveryCorrelationResult>,
    logFields: DeliveryLogFields,
  ): void {
    void correlation.then(
      (result) => {
        this.logDelivery(this.withCorrelationResult(logFields, result));
      },
      (error: unknown) => {
        this.logPostAcknowledgementFailure(logFields.deliveryId, error);
        this.logDelivery(logFields);
      },
    );
  }

  private withCorrelationResult(
    fields: DeliveryLogFields,
    result: DeliveryCorrelationResult,
  ): DeliveryLogFields {
    if (!result.applied) {
      return fields;
    }
    return {
      ...fields,
      correlationOutcome: result.correlationOutcome,
      officialCode:
        result.correlationOutcome === DeliveryCorrelationOutcome.CORRELATED
          ? result.officialCode
          : null,
    };
  }

  /**
   * Same discriminator `result-prms-sync.service.ts` uses
   * (`ARI_IS_PRODUCTION ? 'PROD' : 'TEST'`). Not a second one.
   */
  private environmentLabel(): 'PROD' | 'TEST' {
    return this.appConfig.ARI_IS_PRODUCTION ? 'PROD' : 'TEST';
  }

  private logFields(
    deliveryId: string | null,
    environment: 'PROD' | 'TEST',
    correlationOutcome: DeliveryCorrelationOutcome,
    externalReference: string | null,
  ): DeliveryLogFields {
    return {
      deliveryId,
      environment,
      correlationOutcome,
      externalReference,
      officialCode: null,
    };
  }

  private logDelivery(fields: DeliveryLogFields): void {
    this.logger._log(
      `PRMS webhook delivery delivery_id=${fields.deliveryId ?? 'none'} ` +
        `environment=${fields.environment} ` +
        `correlation_outcome=${fields.correlationOutcome} ` +
        `external_reference=${fields.externalReference ?? 'none'} ` +
        `official_code=${fields.officialCode ?? 'none'}`,
    );
  }

  private logPostAcknowledgementFailure(
    deliveryId: string | null,
    error: unknown,
  ): void {
    this.logger._error(
      `Post-acknowledgement correlation failed for delivery_id=${deliveryId ?? 'none'}: ${errorText(error)}`,
    );
  }

  private acknowledgement(): ServiceResponseDto<{ received: true }> {
    return ResponseUtils.format({
      description: 'PRMS delivery stored',
      status: HttpStatus.OK,
      data: { received: true },
    });
  }
}
