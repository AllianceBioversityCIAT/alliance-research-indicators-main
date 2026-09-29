import { ApiProperty } from '@nestjs/swagger';

export const PRMS_SYNC_HISTORY_FOUND = 'PRMS synchronization history found';

export class PrmsSyncHistoryEventDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: ['STAR', 'PRMS'] })
  event_source: 'STAR' | 'PRMS';

  @ApiProperty({ type: String, nullable: true })
  status: string | null;

  @ApiProperty({ type: String, nullable: true })
  decision: string | null;

  @ApiProperty()
  occurred_at: string;

  @ApiProperty({ type: String, nullable: true })
  decided_at: string | null;

  @ApiProperty({ type: String, nullable: true })
  justification: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Resolved from sec_users for STAR rows only. Null on PRMS rows.',
  })
  actor_name: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'First token of sec_users.first_name plus the first token of sec_users.last_name, Title-Cased. Null on PRMS rows.',
  })
  actor_name_short: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'PRMS reviewer name, verbatim. Null on STAR rows.',
  })
  reviewer_name: string | null;

  @ApiProperty({ type: String, nullable: true })
  reviewer_role: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'Field-level diff computed by PoolFundingMappingDiffService: ' +
      '{ "<label>": { before, after } }. `{}` means the diff ran and found ' +
      'nothing to report; `null` means it has not run on this row (rows ' +
      'from before that service shipped, or non-CORRELATED / non-PRMS ' +
      'events). The client renders the "See what changed" link only when ' +
      'this is a non-empty object.',
  })
  changes: Record<string, unknown> | null;
}

export class PrmsSyncHistoryDto {
  @ApiProperty({ type: Number, nullable: true })
  prms_result_code: number | null;

  @ApiProperty({ type: Number, nullable: true })
  prms_phase_id: number | null;

  @ApiProperty({
    description:
      "Count of active non-duplicate STAR rows with status PENDING_REVIEW for this result's reporting year.",
  })
  sync_count: number;

  @ApiProperty({ type: () => [PrmsSyncHistoryEventDto] })
  events: PrmsSyncHistoryEventDto[];
}
