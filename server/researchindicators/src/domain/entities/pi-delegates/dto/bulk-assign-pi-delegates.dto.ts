// @akili-spec docs/specs/changes/my-pi-delegates — T-10
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
 * The per-delegate entry in a bulk-assign request (R-PID-009 AC.1).
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
 * Payload for POST /pi-delegates — bulk sync (R-PID-009, design.md §10.1).
 *
 * project_ids × delegates is the Cartesian set applied: the same `delegates`
 * list is synchronised into every `project_id` in the request (DD-K).
 *
 * Sync semantics (R-PID-009 AC.2 — Model B):
 *   created  = delegates in the list but not currently active for the project.
 *   revoked  = active delegates for the project not in the list.
 *   kept     = intersection (active and in the list).
 *
 * Authorization: the caller must be PI/active-delegate/SYSTEM_ADMIN for every
 * project_id (R-PID-007, R-PID-009 AC.3) — fail-fast, nothing applied.
 * PI-exclusion (R-PID-008) is enforced per (project, delegate) pair — fail-fast.
 * The whole operation runs in one transaction (R-PID-009 AC.6).
 */
export class BulkAssignPiDelegatesDto {
  @ApiProperty({
    type: [String],
    description:
      'Agresso agreement IDs of the projects to synchronise. ' +
      'The same delegates list is applied to each project (cartesian). ' +
      'At least one project_id is required.',
    example: ['INIT-268', 'INIT-269'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  project_ids!: string[];

  @ApiProperty({
    type: [DelegateInputDto],
    description:
      'Desired set of delegates to assign to every project_id. ' +
      'Each entry is either an existing delegate_user_id or an identity object ' +
      '(email + names) to provision. At least one delegate is required.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DelegateInputDto)
  delegates!: DelegateInputDto[];
}
