// @akili-spec docs/specs/changes/my-pi-delegates-ui — history endpoint
//
// Response DTO for GET /pi-delegates/history.
// Each entry represents one row in pi_delegate_history enriched with:
//   - actor identity (created_by → sec_users LEFT JOIN — nullable when user is gone)
//   - target delegate identity (delegate_user_id → sec_users LEFT JOIN — nullable)
//   - project description (project_id → agresso_contracts LEFT JOIN — nullable)
import { ApiProperty } from '@nestjs/swagger';
import { PiDelegateHistoryActionEnum } from '../enum/pi-delegate-history-action.enum';

// ─── Sub-objects ──────────────────────────────────────────────────────────────

export class HistoryActorDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'sec_users.sec_user_id of the actor who performed the action (created_by)',
    example: 50,
  })
  user_id!: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Actor's full name (first_name + ' ' + last_name). " +
      'Null when the account no longer exists.',
    example: 'Jane Smith',
  })
  name!: string | null;
}

export class HistoryDelegateDto {
  @ApiProperty({
    type: Number,
    description:
      'sec_users.sec_user_id of the delegate targeted by this action',
    example: 42,
  })
  user_id!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Delegate's full name (first_name + ' ' + last_name). " +
      'Null when the account no longer exists.',
    example: 'Juan Carlos Cadavid',
  })
  name!: string | null;
}

export class HistoryProjectDto {
  @ApiProperty({
    type: String,
    description: 'agresso_contracts.agreement_id (Agresso project code)',
    example: 'INIT-268',
  })
  project_code!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'agresso_contracts.description (project name). Null when the project row is gone.',
    example: 'Initiative 268 — Sustainable Food Systems',
  })
  project_name!: string | null;
}

// ─── Top-level entry ──────────────────────────────────────────────────────────

export class PiDelegateHistoryEntryDto {
  @ApiProperty({
    type: Number,
    description: 'pi_delegate_history.pi_delegate_history_id (primary key)',
    example: 1,
  })
  pi_delegate_history_id!: number;

  @ApiProperty({
    enum: PiDelegateHistoryActionEnum,
    description: "Action recorded: 'assign' or 'revoke'",
    example: PiDelegateHistoryActionEnum.ASSIGN,
  })
  action!: PiDelegateHistoryActionEnum;

  @ApiProperty({ type: HistoryActorDto })
  actor!: HistoryActorDto;

  @ApiProperty({ type: HistoryDelegateDto })
  delegate!: HistoryDelegateDto;

  @ApiProperty({ type: HistoryProjectDto })
  project!: HistoryProjectDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Timestamp when this history row was created (ISO 8601, newest-first ordering)',
    example: '2026-09-14T12:34:56.000Z',
  })
  created_at!: Date;
}
