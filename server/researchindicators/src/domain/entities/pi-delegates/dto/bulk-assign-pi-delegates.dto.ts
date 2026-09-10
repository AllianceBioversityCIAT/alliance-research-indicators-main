// @akili-spec docs/specs/changes/my-pi-delegates — T-17/T-19/T-20
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { DelegateIdentityDto } from './create-pi-delegate.dto';

export { DelegateIdentityDto };

/**
 * The per-delegate entry in a bulk-assign request (R-PID-009 AC.1 / R-PID-011 AC.1).
 *
 * Mirrors the union from CreatePiDelegateDto so the same reciprocal
 * @ValidateIf pattern is preserved:
 *   - delegate_user_id  → reuse an existing sec_users row (identify by PK).
 *   - delegate          → provision a new sec_user via createUserInSecUsers.
 *
 * At least one MUST be present per entry; when both are absent class-validator
 * fires on the required sub-fields, yielding a 400 before the service is reached.
 * When both are supplied the service prefers delegate_user_id.
 *
 * carnet is optional and resolved server-side via alliance_user_staff (OQ-D).
 */
export class DelegateInputDto {
  /**
   * sec_users.sec_user_id of an already-existing delegate.
   * Required when delegate (identity object) is absent.
   */
  @ApiPropertyOptional({
    type: Number,
    description:
      'Existing sec_users.sec_user_id of the delegate. ' +
      'Provide this OR delegate (identity object) — at least one is required.',
    example: 42,
  })
  @ValidateIf((o: DelegateInputDto) => o.delegate == null)
  @IsNotEmpty()
  @IsInt()
  delegate_user_id?: number;

  /**
   * Full identity for a delegate not yet in sec_users.
   * Required when delegate_user_id is absent.
   */
  @ApiPropertyOptional({
    type: DelegateIdentityDto,
    description:
      'Email + names to provision a new sec_user for the delegate. ' +
      'Provide this OR delegate_user_id — at least one is required.',
  })
  @ValidateIf((o: DelegateInputDto) => o.delegate_user_id == null)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DelegateIdentityDto)
  delegate?: DelegateIdentityDto;

  /**
   * Optional CGIAR carnet.  When present it is resolved server-side via
   * alliance_user_staff to look up or provision the sec_user (OQ-D).
   */
  @ApiPropertyOptional({
    type: String,
    description:
      'Optional CGIAR carnet resolved server-side via alliance_user_staff (OQ-D)',
    example: 'C012345',
  })
  @IsOptional()
  @IsString()
  carnet?: string;
}

/**
 * One project + its desired delegate list (R-PID-011 AC.1 / design.md §11.2).
 *
 * An empty `delegates` array is VALID — it instructs the service to revoke
 * ALL active delegates for this project (R-PID-011 AC.3, Option B).
 * Therefore @ArrayNotEmpty is intentionally absent on `delegates`.
 */
export class ProjectAssignmentDto {
  @ApiProperty({
    type: String,
    description: 'Agresso agreement ID of the project to synchronise.',
    example: 'INIT-268',
  })
  @IsString()
  @IsNotEmpty()
  project_id!: string;

  @ApiProperty({
    type: [DelegateInputDto],
    description:
      'Desired set of delegates for this project. ' +
      'An empty array revokes ALL active delegates (R-PID-011 AC.3).',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DelegateInputDto)
  delegates!: DelegateInputDto[];
}

/**
 * Payload for POST /pi-delegates — per-project bulk sync (R-PID-011 / design.md §11.2).
 *
 * Each entry in `assignments` carries its own project_id and delegate list.
 * No cross-project cartesian — each project is synced to its own list (DD-L).
 *
 * Sync semantics per project (R-PID-011 AC.2 — Model B):
 *   created  = delegates in the list but not currently active for the project.
 *   revoked  = active delegates for the project not in the list.
 *   kept     = intersection (active and in the list).
 *   (empty list → all current delegates revoked — R-PID-011 AC.3)
 *
 * Authorization: the caller must be PI/active-delegate/SYSTEM_ADMIN for every
 * project_id (R-PID-007) — fail-fast, nothing applied on any 403.
 * PI-exclusion (R-PID-008) is enforced per (project, delegate) pair — fail-fast.
 * Delegates are provisioned ONCE across all assignments and reused (R-PID-011 AC.4).
 * The whole operation runs in ONE transaction (R-PID-011 AC.4).
 */
export class BulkAssignPiDelegatesDto {
  @ApiProperty({
    type: [ProjectAssignmentDto],
    description:
      'Per-project assignment list. Each entry carries a project_id and its ' +
      'desired delegate set. At least one assignment is required. ' +
      'An empty delegates array for a project revokes all its active delegates.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProjectAssignmentDto)
  assignments!: ProjectAssignmentDto[];
}
