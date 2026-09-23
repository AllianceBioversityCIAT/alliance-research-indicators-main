import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';
import { DeliveryCorrelationOutcome } from './enum/delivery-correlation-outcome.enum';
import { DeliveryProcessingState } from './enum/delivery-processing-state.enum';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-06 /
// R-PWH-007 · R-PWH-005 AC.1, AC.2 · R-PWH-008 AC.5 · R-PWH-003 AC.4 ·
// NFR-PWH-003 · design §6.4, DD-6, DD-7.

/**
 * Live-row lookup. All four predicates of the `ResultsUtil` convention,
 * in the design §6.4 order: platform, official code, active, not a
 * snapshot. `platform_code` is a literal from `ReportingPlatformEnum.STAR`
 * so dropping that predicate does not shift the bound official code.
 * `ORDER BY result_id ASC` is what "the first" means when more than one
 * live row matches (R-PWH-007 AC.4) — without it the engine picks.
 */
const LIVE_ROW_SQL = `
SELECT result_id
FROM results
WHERE platform_code = '${ReportingPlatformEnum.STAR}'
  AND result_official_code = ?
  AND is_active = TRUE
  AND is_snapshot = FALSE
ORDER BY result_id ASC
`;

const APPLY_OUTCOME_SQL = `
UPDATE result_prms_sync_history
SET correlation_outcome = ?,
    result_id = ?,
    processing_state = ?
WHERE id = ?
`;

const MARK_FAILED_SQL = `
UPDATE result_prms_sync_history
SET processing_state = ?
WHERE id = ?
`;

export interface DeliveryCorrelationInput {
  /** Primary key of the delivery row already inserted. */
  id: number;
  /** Header `x-prms-delivery-id`. Null when PRMS omitted it. */
  delivery_id: string | null;
  external_reference: string | null;
}

export interface DeliveryCorrelationApplied {
  applied: true;
  correlationOutcome: DeliveryCorrelationOutcome;
  resultId: number | null;
  /** STAR official code when correlated; null on the stop branches. */
  officialCode: number | null;
  processingState: DeliveryProcessingState.PROCESSED;
}

export interface DeliveryCorrelationFailed {
  applied: false;
  processingState: DeliveryProcessingState.PROCESSING_FAILED;
}

export type DeliveryCorrelationResult =
  | DeliveryCorrelationApplied
  | DeliveryCorrelationFailed;

type ReferenceResolution =
  | { kind: 'absent' }
  | { kind: 'invalid' }
  | { kind: 'code'; code: number };

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * A canonical base-10 integer, and nothing else.
 * `Number('')` is `0` and `Number('abc')` is `NaN` — neither may reach
 * the query (R-PWH-007 AC.2). Leading zeros are rejected because
 * `Number('01441061')` is `1441061`, a different code than the text.
 */
const parseOfficialCode = (externalReference: string): number | null => {
  if (!/^[0-9]+$/.test(externalReference)) {
    return null;
  }
  const code = Number(externalReference);
  if (!Number.isSafeInteger(code) || String(code) !== externalReference) {
    return null;
  }
  return code;
};

@Injectable()
export class DeliveryCorrelatorService {
  private readonly logger = new LoggerUtil({
    name: DeliveryCorrelatorService.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Post-acknowledgement step (design §6.3 step 5, §6.4). Never throws:
   * the `2xx` has already been sent (R-PWH-003 AC.4).
   *
   * No branch writes `results` (DD-7). The callback's `data.result_code`
   * stays on the delivery row, where the insert put it.
   */
  async correlate(
    delivery: DeliveryCorrelationInput,
  ): Promise<DeliveryCorrelationResult> {
    try {
      return await this.apply(delivery);
    } catch (error) {
      this.logFailure(delivery, error);
      try {
        await this.markProcessingFailed(delivery.id);
      } catch (markError) {
        this.logFailure(delivery, markError);
      }
      return {
        applied: false,
        processingState: DeliveryProcessingState.PROCESSING_FAILED,
      };
    }
  }

  private async apply(
    delivery: DeliveryCorrelationInput,
  ): Promise<DeliveryCorrelationApplied> {
    const reference = this.classifyReference(delivery.external_reference);
    if (reference.kind === 'absent') {
      return this.finish(
        delivery.id,
        DeliveryCorrelationOutcome.NO_REFERENCE,
        null,
        null,
      );
    }
    if (reference.kind === 'invalid') {
      return this.finish(
        delivery.id,
        DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        null,
        null,
      );
    }

    const rows: Array<{ result_id: unknown }> = await this.dataSource.query(
      LIVE_ROW_SQL,
      [reference.code],
    );
    if (rows.length === 0) {
      return this.finish(
        delivery.id,
        DeliveryCorrelationOutcome.UNKNOWN_REFERENCE,
        null,
        null,
      );
    }
    if (rows.length > 1) {
      this.logger._warn(
        `Ambiguous correlation for external_reference=${delivery.external_reference}: ${rows.length} live rows matched; applying the first`,
      );
    }
    const resultId = Number(rows[0].result_id);
    if (!Number.isInteger(resultId)) {
      throw new Error(
        `live result_id is not an integer: ${String(rows[0].result_id)}`,
      );
    }
    return this.finish(
      delivery.id,
      DeliveryCorrelationOutcome.CORRELATED,
      resultId,
      reference.code,
    );
  }

  private classifyReference(
    externalReference: string | null,
  ): ReferenceResolution {
    if (externalReference == null) {
      return { kind: 'absent' };
    }
    if (typeof externalReference !== 'string') {
      return { kind: 'invalid' };
    }
    const code = parseOfficialCode(externalReference);
    if (code === null) {
      return { kind: 'invalid' };
    }
    return { kind: 'code', code };
  }

  private async finish(
    deliveryRowId: number,
    correlationOutcome: DeliveryCorrelationOutcome,
    resultId: number | null,
    officialCode: number | null,
  ): Promise<DeliveryCorrelationApplied> {
    await this.dataSource.query(APPLY_OUTCOME_SQL, [
      correlationOutcome,
      resultId,
      DeliveryProcessingState.PROCESSED,
      deliveryRowId,
    ]);
    return {
      applied: true,
      correlationOutcome,
      resultId,
      officialCode,
      processingState: DeliveryProcessingState.PROCESSED,
    };
  }

  private markProcessingFailed(deliveryRowId: number): Promise<unknown> {
    return this.dataSource.query(MARK_FAILED_SQL, [
      DeliveryProcessingState.PROCESSING_FAILED,
      deliveryRowId,
    ]);
  }

  private logFailure(delivery: DeliveryCorrelationInput, error: unknown): void {
    this.logger._error(
      `Post-acknowledgement correlation failed for delivery_id=${delivery.delivery_id ?? 'none'} id=${delivery.id}: ${errorText(error)}`,
    );
  }
}
