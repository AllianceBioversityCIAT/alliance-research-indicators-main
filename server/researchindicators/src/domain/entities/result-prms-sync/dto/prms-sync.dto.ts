import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrmsSyncOutcome } from '../../../tools/prms-normalizer/enum/prms-sync-outcome.enum';
import { PrmsSyncResponseData } from '../result-prms-sync.service';

/**
 * Distinct envelope `description` per HTTP status (R-PRMS-001 AC.2 / NFR-PRMS-004).
 * Runtime 409/422 messages from the service stay more specific; these are the
 * Swagger-stable strings so each status renders its own text at /swagger.
 */
export const PRMS_SYNC_HTTP_DESCRIPTIONS = {
  accepted: 'PRMS sync accepted',
  statusFound: 'PRMS sync status found',
  notFound: 'Result not found',
  conflict:
    'Result is already synced to PRMS, a sync is already in progress, or an unconfirmed attempt requires attention',
  unprocessable: 'Result is ineligible, gated, or the payload is incomplete',
  rejectedByPrms: 'PRMS rejected the ingest',
  transportOrRetryable: 'PRMS transport failed or the ingest is retryable',
} as const;

export type PrmsSyncState = 'never_synced' | 'synced' | 'failed';

export class PrmsSyncResponseDto implements PrmsSyncResponseData {
  @ApiProperty({ enum: PrmsSyncOutcome })
  outcome: PrmsSyncOutcome;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Monotonic attempt number. Null when the gate refuses before writing a row (JD-8) — never 0.',
  })
  attempt_number: number | null;

  @ApiProperty({ type: Number, nullable: true })
  http_status: number | null;

  @ApiProperty({ type: String, nullable: true })
  request_id: string | null;

  @ApiProperty({ type: Number, nullable: true })
  prms_result_code: number | null;

  @ApiProperty({ type: String, nullable: true })
  failure_reason: string | null;
}

export class PrmsSyncLastAttemptDto {
  @ApiProperty({ type: Number })
  attempt_number: number;

  @ApiProperty({ enum: PrmsSyncOutcome })
  outcome: PrmsSyncOutcome;

  @ApiProperty({ type: Number, nullable: true })
  http_status: number | null;

  @ApiProperty({ type: String, nullable: true })
  request_id: string | null;

  @ApiProperty({ type: String, nullable: true })
  failure_reason: string | null;

  @ApiProperty({ type: String })
  environment: string;

  @ApiProperty({ type: String, nullable: true })
  prms_type: string | null;

  @ApiProperty()
  created_at: Date | string;
}

export class PrmsSyncLastDecisionDto {
  @ApiProperty({
    enum: ['APPROVE', 'REJECT'],
    description:
      'Science Program verdict on the latest non-duplicate correlated delivery.',
  })
  decision: string | null;

  @ApiProperty({ nullable: true })
  decided_at: Date | string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Reviewer text verbatim. Null when PRMS sent none (typical for APPROVE).',
  })
  justification: string | null;

  @ApiProperty({ type: Number, nullable: true })
  prms_result_code: number | null;

  @ApiProperty({
    description: 'When STAR received the delivery (column received_at).',
  })
  delivery_received_at: Date | string | null;
}

export class PrmsSyncStatusDto {
  @ApiProperty({
    enum: ['never_synced', 'synced', 'failed'],
    description:
      'Derived sync state for children 2–4 (R-PRMS-014). never synced / synced / failed.',
  })
  sync_state: PrmsSyncState;

  @ApiProperty({ type: Boolean })
  is_synced_to_prms: boolean;

  @ApiProperty({ type: Number, nullable: true })
  prms_result_code: number | null;

  @ApiPropertyOptional({
    type: () => PrmsSyncLastAttemptDto,
    nullable: true,
    description:
      'Most recent attempt. Never includes request_payload (R-PRMS-014 AC.2).',
  })
  last_attempt: PrmsSyncLastAttemptDto | null;

  @ApiPropertyOptional({
    type: () => PrmsSyncLastDecisionDto,
    nullable: true,
    description:
      'Latest non-duplicate correlated decision, or null when none exists (R-PWH-008). A projection — earlier decisions stay in the history.',
  })
  last_decision: PrmsSyncLastDecisionDto | null;
}
