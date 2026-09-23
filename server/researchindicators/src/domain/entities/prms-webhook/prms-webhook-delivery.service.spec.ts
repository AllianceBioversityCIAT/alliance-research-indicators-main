import { HttpStatus } from '@nestjs/common';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ServiceResponseDto } from '../../shared/global-dto/service-response.dto';
import {
  DeliveryCorrelationInput,
  DeliveryCorrelationResult,
  DeliveryCorrelatorService,
} from './delivery-correlator.service';
import { DeliveryCorrelationOutcome } from './enum/delivery-correlation-outcome.enum';
import { DeliveryProcessingState } from './enum/delivery-processing-state.enum';
import {
  PrmsWebhookDeliveryRepository,
  RecordDeliveryInput,
  RecordDeliveryResult,
} from './repositories/prms-webhook-delivery.repository';
import {
  AcceptPrmsDeliveryInput,
  PrmsWebhookDeliveryService,
} from './prms-webhook-delivery.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-09.
//
// KZ-017 — what this tier structurally CANNOT reach: `recordDelivery` is
// a mock. "The row exists when the 2xx is produced" is proved by the
// handler awaiting that mock's resolution, not by a committed MySQL row.
// The transaction itself is T-05. A synchronous correlator stub is
// disqualified for AC.2 (DC-6): the never-settling promise below is the
// one that can tell a detached call from an awaited one.

const DELIVERY_ROW_ID = 11;
const DELIVERY_HEADER_ID = '4172';
const OFFICIAL = '1441061';
const DECIDED_AT = '2026-08-25T14:31:02.117Z';
const JUSTIFICATION = 'The evidence link is not publicly accessible.';

const applied = (
  correlationOutcome: DeliveryCorrelationOutcome,
  officialCode: number | null = null,
): DeliveryCorrelationResult => ({
  applied: true,
  correlationOutcome,
  resultId: officialCode === null ? null : 40,
  officialCode,
  processingState: DeliveryProcessingState.PROCESSED,
});

const wellFormedBody = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  result_id: 12345,
  external_reference: OFFICIAL,
  decision: 'APPROVE',
  decided_at: DECIDED_AT,
  data: {
    result_code: 5521,
    contributor_email: 'a.person@cgiar.org',
  },
  ...overrides,
});

const request = (
  body: unknown,
  deliveryId: string | null = DELIVERY_HEADER_ID,
): AcceptPrmsDeliveryInput => ({
  deliveryId,
  body,
  rawHeaders:
    deliveryId === null
      ? null
      : { 'x-prms-delivery-id': deliveryId, authorization: 'super-secret' },
});

describe('PrmsWebhookDeliveryService', () => {
  let recordDelivery: jest.Mock<
    Promise<RecordDeliveryResult>,
    [RecordDeliveryInput]
  >;
  let correlate: jest.Mock<
    Promise<DeliveryCorrelationResult>,
    [DeliveryCorrelationInput]
  >;
  let logLines: string[];
  let errorLines: string[];
  let service: PrmsWebhookDeliveryService;

  const build = (isProduction: boolean): PrmsWebhookDeliveryService =>
    new PrmsWebhookDeliveryService(
      { recordDelivery } as unknown as PrmsWebhookDeliveryRepository,
      { correlate } as unknown as DeliveryCorrelatorService,
      { ARI_IS_PRODUCTION: isProduction } as AppConfig,
    );

  const storedInput = (): RecordDeliveryInput => {
    expect(recordDelivery).toHaveBeenCalledTimes(1);
    return recordDelivery.mock.calls[0][0];
  };

  const is2xx = (response: ServiceResponseDto<{ received: true }>): void => {
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
    expect(response.data).toEqual({ received: true });
  };

  beforeEach(() => {
    recordDelivery = jest.fn().mockResolvedValue({
      kind: 'recorded',
      deliveryRowId: DELIVERY_ROW_ID,
      correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
    });
    correlate = jest
      .fn()
      .mockResolvedValue(applied(DeliveryCorrelationOutcome.UNKNOWN_REFERENCE));
    logLines = [];
    errorLines = [];
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation((message: unknown) => {
        logLines.push(String(message));
      });
    jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation((message: unknown) => {
        errorLines.push(String(message));
      });
    service = build(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('R-PWH-003 AC.1 — store, then acknowledge', () => {
    it('does not produce the 2xx until recordDelivery has resolved', async () => {
      let release: (value: RecordDeliveryResult) => void = () => undefined;
      recordDelivery.mockReturnValue(
        new Promise((resolve) => {
          release = resolve;
        }),
      );

      let settled = false;
      const pending = service
        .accept(request(wellFormedBody()))
        .then((response) => {
          settled = true;
          return response;
        });

      await Promise.resolve();
      expect(settled).toBe(false);
      expect(recordDelivery).toHaveBeenCalledTimes(1);

      release({
        kind: 'recorded',
        deliveryRowId: DELIVERY_ROW_ID,
        correlationOutcome: DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      });

      is2xx(await pending);
      expect(settled).toBe(true);
    });
  });

  describe('R-PWH-003 AC.2 / DC-6 — the acknowledgement does not await the correlator', () => {
    // FALSIFIER (a). The stub is a promise that never settles. `await` on
    // the correlator call makes this test time out; a synchronous stub
    // would pass either way and is disqualified.
    it('resolves while the correlator promise is still pending', async () => {
      correlate.mockReturnValue(new Promise(() => {}));

      const response = await service.accept(request(wellFormedBody()));

      is2xx(response);
      expect(recordDelivery).toHaveBeenCalledTimes(1);
      expect(correlate).toHaveBeenCalledTimes(1);
      expect(correlate).toHaveBeenCalledWith({
        id: DELIVERY_ROW_ID,
        delivery_id: DELIVERY_HEADER_ID,
        result_official_code: OFFICIAL,
      });
    }, 1000);
  });

  describe('R-PWH-005 AC.3 / carried gate — MALFORMED is stored and not dispatched', () => {
    // FALSIFIER (d). The stub stands in for `finish()`, which overwrites
    // `correlation_outcome` unconditionally. Dispatching this row would
    // replace MALFORMED with CORRELATED (the reference is present and
    // `finish()` does not read the ingest classification).
    const armDestructiveCorrelator = (): {
      persisted: () => DeliveryCorrelationOutcome;
    } => {
      let persisted = DeliveryCorrelationOutcome.MALFORMED;
      correlate.mockImplementation(() => {
        persisted = DeliveryCorrelationOutcome.CORRELATED;
        return Promise.resolve(
          applied(DeliveryCorrelationOutcome.CORRELATED, 1441061),
        );
      });
      return { persisted: () => persisted };
    };

    it('keeps MALFORMED when decision is missing, retains the raw body, and answers 2xx', async () => {
      const gate = armDestructiveCorrelator();
      const body = wellFormedBody();
      delete body.decision;

      const response = await service.accept(request(body));

      is2xx(response);
      const stored = storedInput();
      expect(stored.correlation_outcome).toBe(
        DeliveryCorrelationOutcome.MALFORMED,
      );
      expect(stored.raw_body).toEqual(body);
      expect(stored.decision).toBeNull();
      expect(gate.persisted()).toBe(DeliveryCorrelationOutcome.MALFORMED);
      expect(correlate).not.toHaveBeenCalled();
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toContain('correlation_outcome=MALFORMED');
    });

    it('classifies an unparseable decided_at as MALFORMED and answers 2xx', async () => {
      const gate = armDestructiveCorrelator();

      const response = await service.accept(
        request(wellFormedBody({ decided_at: 'not-a-date' })),
      );

      is2xx(response);
      const stored = storedInput();
      expect(stored.correlation_outcome).toBe(
        DeliveryCorrelationOutcome.MALFORMED,
      );
      expect(stored.decided_at).toBeNull();
      expect(gate.persisted()).toBe(DeliveryCorrelationOutcome.MALFORMED);
      expect(correlate).not.toHaveBeenCalled();
    });

    it('does not normalise a past-tense decision; the row is MALFORMED and decision is null', async () => {
      const response = await service.accept(
        request(wellFormedBody({ decision: 'APPROVED' })),
      );

      is2xx(response);
      const stored = storedInput();
      expect(stored.correlation_outcome).toBe(
        DeliveryCorrelationOutcome.MALFORMED,
      );
      expect(stored.decision).toBeNull();
      expect(correlate).not.toHaveBeenCalled();
    });

    it('classifies a lowercase decision as MALFORMED rather than coercing it', async () => {
      const response = await service.accept(
        request(wellFormedBody({ decision: 'approve' })),
      );

      is2xx(response);
      expect(storedInput().decision).toBeNull();
      expect(storedInput().correlation_outcome).toBe(
        DeliveryCorrelationOutcome.MALFORMED,
      );
    });

    it('classifies a non-object body as MALFORMED, stores a null raw body, and answers 2xx', async () => {
      const response = await service.accept(request(null));

      is2xx(response);
      const stored = storedInput();
      expect(stored.correlation_outcome).toBe(
        DeliveryCorrelationOutcome.MALFORMED,
      );
      expect(stored.raw_body).toBeNull();
      expect(correlate).not.toHaveBeenCalled();
    });
  });

  describe('R-PWH-005 AC.4 — the inbound external_reference null or absent is NO_REFERENCE', () => {
    it('stores NO_REFERENCE and answers 2xx when external_reference is null', async () => {
      correlate.mockResolvedValue(
        applied(DeliveryCorrelationOutcome.NO_REFERENCE),
      );

      const response = await service.accept(
        request(wellFormedBody({ external_reference: null })),
      );

      is2xx(response);
      const stored = storedInput();
      expect(stored.correlation_outcome).toBe(
        DeliveryCorrelationOutcome.NO_REFERENCE,
      );
      expect(stored.result_official_code).toBeNull();
      expect(stored.decision).toBe('APPROVE');
      expect(correlate).toHaveBeenCalledWith({
        id: DELIVERY_ROW_ID,
        delivery_id: DELIVERY_HEADER_ID,
        result_official_code: null,
      });
    });

    it('stores NO_REFERENCE when the external_reference key is absent', async () => {
      const body = wellFormedBody();
      delete body.external_reference;

      await service.accept(request(body));

      expect(storedInput().correlation_outcome).toBe(
        DeliveryCorrelationOutcome.NO_REFERENCE,
      );
      expect(storedInput().result_official_code).toBeNull();
    });
  });

  describe('R-PWH-005 AC.5 / AC.6 — justification and decision verbatim', () => {
    it('stores APPROVE and REJECT verbatim, never in the past tense', async () => {
      await service.accept(request(wellFormedBody({ decision: 'APPROVE' })));
      expect(storedInput().decision).toBe('APPROVE');

      recordDelivery.mockClear();
      await service.accept(request(wellFormedBody({ decision: 'REJECT' })));
      expect(storedInput().decision).toBe('REJECT');
    });

    it('stores justification byte-identical to the text PRMS sent', async () => {
      await service.accept(
        request(
          wellFormedBody({
            decision: 'REJECT',
            justification: JUSTIFICATION,
          }),
        ),
      );

      expect(storedInput().justification).toBe(JUSTIFICATION);
    });

    // FALSIFIER (c). Storing `''` for an omitted justification reddens
    // `toBeNull()`.
    it('stores an omitted justification as NULL, never as an empty string', async () => {
      const body = wellFormedBody();
      delete body.justification;

      await service.accept(request(body));

      expect(storedInput().justification).toBeNull();
    });

    it('stores an explicit null justification as NULL', async () => {
      await service.accept(request(wellFormedBody({ justification: null })));

      expect(storedInput().justification).toBeNull();
    });
  });

  describe('R-PWH-009 AC.4 — environment from ARI_IS_PRODUCTION', () => {
    it('stamps TEST when ARI_IS_PRODUCTION is false', async () => {
      await service.accept(request(wellFormedBody()));

      expect(storedInput().environment).toBe('TEST');
    });

    it('stamps PROD when ARI_IS_PRODUCTION is true', async () => {
      service = build(true);
      correlate.mockResolvedValue(
        applied(DeliveryCorrelationOutcome.CORRELATED, 1441061),
      );

      await service.accept(request(wellFormedBody()));

      expect(storedInput().environment).toBe('PROD');
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toContain('environment=PROD');
    });
  });

  describe('R-PWH-003 AC.4 — a throw after the store does not become a 5xx', () => {
    // FALSIFIER (b). A synchronous throw from the correlator must be
    // caught. If it propagates, `resolves` fails and the 2xx is lost.
    it('logs a synchronous correlator throw at error and still answers 2xx', async () => {
      correlate.mockImplementation(() => {
        throw new Error('correlator exploded');
      });

      const response = await service.accept(request(wellFormedBody()));

      is2xx(response);
      expect(recordDelivery).toHaveBeenCalledTimes(1);
      expect(errorLines).toHaveLength(1);
      expect(errorLines[0]).toContain(`delivery_id=${DELIVERY_HEADER_ID}`);
      expect(errorLines[0]).toContain('correlator exploded');
    });

    it('logs a rejected correlator promise at error and still answers 2xx', async () => {
      correlate.mockRejectedValue(new Error('correlator rejected'));

      const response = await service.accept(request(wellFormedBody()));

      is2xx(response);
      expect(errorLines).toHaveLength(1);
      expect(errorLines[0]).toContain(`delivery_id=${DELIVERY_HEADER_ID}`);
      expect(errorLines[0]).toContain('correlator rejected');
      expect(logLines).toHaveLength(1);
    });
  });

  describe('R-PWH-006 AC.3 — a duplicate skips the detached step', () => {
    it('answers 2xx and does not call the correlator when the repository reports a repeat', async () => {
      recordDelivery.mockResolvedValue({
        kind: 'duplicate',
        deliveryRowId: 12,
        duplicateOfId: DELIVERY_ROW_ID,
      });

      const response = await service.accept(request(wellFormedBody()));

      is2xx(response);
      expect(correlate).not.toHaveBeenCalled();
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toContain('correlation_outcome=DUPLICATE');
      expect(logLines[0]).toContain(`delivery_id=${DELIVERY_HEADER_ID}`);
    });
  });

  describe('R-PWH-006 AC.4 — a delivery without x-prms-delivery-id is not pre-classified as a duplicate', () => {
    it('passes a null delivery id and answers 2xx', async () => {
      const response = await service.accept(request(wellFormedBody(), null));

      is2xx(response);
      const stored = storedInput();
      expect(stored.delivery_id).toBeNull();
      expect(stored.correlation_outcome).not.toBe(
        DeliveryCorrelationOutcome.DUPLICATE,
      );
      expect(correlate).toHaveBeenCalledWith(
        expect.objectContaining({ delivery_id: null }),
      );
    });
  });

  describe('NFR-PWH-003 — one delivery log line', () => {
    it('logs delivery id, environment, outcome, reference, and the STAR official code once the correlator reports CORRELATED', async () => {
      correlate.mockResolvedValue(
        applied(DeliveryCorrelationOutcome.CORRELATED, 1441061),
      );

      await service.accept(request(wellFormedBody()));

      expect(storedInput().correlation_outcome).toBe(
        DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
      );
      expect(logLines).toHaveLength(1);
      const line = logLines[0];
      expect(line).toContain(`delivery_id=${DELIVERY_HEADER_ID}`);
      expect(line).toContain('environment=TEST');
      expect(line).toContain('correlation_outcome=CORRELATED');
      expect(line).toContain(`result_official_code=${OFFICIAL}`);
      expect(line).toContain('official_code=1441061');
      expect(line).not.toContain('super-secret');
      expect(errorLines).toHaveLength(0);
    });
  });

  describe('NFR-PWH-005 — the store is the only failure that escapes', () => {
    it('propagates a repository failure and does not detach', async () => {
      const failure = new Error('lock retry exhausted');
      recordDelivery.mockRejectedValue(failure);

      await expect(service.accept(request(wellFormedBody()))).rejects.toBe(
        failure,
      );
      expect(correlate).not.toHaveBeenCalled();
    });
  });

  describe('retained columns', () => {
    it('stores PRMS ids, the result code, the raw body whole, and the headers it was given', async () => {
      const body = wellFormedBody();
      const headers = {
        'x-prms-delivery-id': DELIVERY_HEADER_ID,
        authorization: 'super-secret',
      };

      await service.accept({
        deliveryId: DELIVERY_HEADER_ID,
        body,
        rawHeaders: headers,
      });

      const stored = storedInput();
      expect(stored.prms_result_id).toBe(12345);
      expect(stored.prms_result_code).toBe(5521);
      expect(stored.raw_body).toEqual(body);
      expect(stored.raw_body).toMatchObject({
        data: { contributor_email: 'a.person@cgiar.org' },
      });
      expect(stored.raw_headers).toBe(headers);
      expect(stored.decided_at).toEqual(new Date(DECIDED_AT));
      expect(stored.result_official_code).toBe(OFFICIAL);
    });
  });
});
