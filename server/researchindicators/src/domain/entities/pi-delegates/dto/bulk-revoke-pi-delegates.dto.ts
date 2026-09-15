// @akili-spec docs/specs/changes/my-pi-delegates — T-10
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Payload for DELETE /pi-delegates — bulk targeted revoke (R-PID-010, design.md §10.1).
 *
 * TWO accepted shapes — EXACTLY ONE must be supplied:
 *
 *   Shape A — revoke by primary key:
 *     { pi_delegate_ids: number[] }
 *
 *   Shape B — revoke by (project × delegate) set:
 *     { project_ids: string[], delegate_user_ids: number[] }
 *
 * "Exactly one" enforcement via reciprocal @ValidateIf:
 *
 *   pi_delegate_ids   is required (non-empty array of ints) when Shape B is absent
 *                     (i.e. when neither project_ids nor delegate_user_ids is provided).
 *
 *   project_ids       is required (non-empty array of strings) when Shape A is absent
 *                     (i.e. when pi_delegate_ids is not provided).
 *
 *   delegate_user_ids is required (non-empty array of ints) when Shape A is absent
 *                     (i.e. when pi_delegate_ids is not provided).
 *
 * Result per case:
 *   - Neither shape supplied  → each field's guard fires → 400 (missing required fields).
 *   - Both shapes supplied    → both guards pass through → service detects ambiguity and
 *                               rejects with BadRequestException (400).
 *   - Shape A only            → pi_delegate_ids validates, project_ids/delegate_user_ids
 *                               guards are inactive (field absent) → passes.
 *   - Shape B only            → project_ids + delegate_user_ids validate, pi_delegate_ids
 *                               guard is inactive → passes.
 *
 * Soft-delete semantics: only the specified active delegations are revoked.
 * This does NOT synchronise (does not touch anything not named) — R-PID-010 AC.2.
 * Authorization is per-project (R-PID-007, AC.3); transactional.
 */
export class BulkRevokePiDelegatesDto {
  /**
   * Shape A — revoke specific pi_delegates rows by their primary key.
   * Required when Shape B (project_ids + delegate_user_ids) is absent.
   * Mutually exclusive with Shape B — the service rejects if both are present.
   */
  @ApiPropertyOptional({
    type: [Number],
    description:
      'Shape A: primary keys of pi_delegates rows to revoke (soft-delete). ' +
      'Provide this OR (project_ids + delegate_user_ids) — exactly one shape is required.',
    example: [7, 12],
  })
  @ValidateIf(
    (o: BulkRevokePiDelegatesDto) =>
      o.project_ids == null && o.delegate_user_ids == null,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  pi_delegate_ids?: number[];

  /**
   * Shape B (part 1 of 2) — Agresso agreement IDs to revoke delegates from.
   * Required (with delegate_user_ids) when Shape A (pi_delegate_ids) is absent.
   */
  @ApiPropertyOptional({
    type: [String],
    description:
      'Shape B: Agresso agreement IDs identifying the projects whose delegates are revoked. ' +
      'Must be supplied together with delegate_user_ids. ' +
      'Provide this pair OR pi_delegate_ids — exactly one shape is required.',
    example: ['INIT-268', 'INIT-269'],
  })
  @ValidateIf((o: BulkRevokePiDelegatesDto) => o.pi_delegate_ids == null)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  project_ids?: string[];

  /**
   * Shape B (part 2 of 2) — sec_users.sec_user_id values of the delegates to revoke.
   * Required (with project_ids) when Shape A (pi_delegate_ids) is absent.
   * Every active (project_id, delegate_user_id) pair across the Cartesian product
   * of project_ids × delegate_user_ids is soft-deleted.
   */
  @ApiPropertyOptional({
    type: [Number],
    description:
      'Shape B: sec_users.sec_user_id values of the delegates to revoke from each project_id. ' +
      'Must be supplied together with project_ids. ' +
      'Provide this pair OR pi_delegate_ids — exactly one shape is required.',
    example: [42, 55],
  })
  @ValidateIf((o: BulkRevokePiDelegatesDto) => o.pi_delegate_ids == null)
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  delegate_user_ids?: number[];
}
