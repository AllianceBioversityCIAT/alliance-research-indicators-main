// @akili-spec docs/specs/changes/my-pi-delegates — T-03
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * Payload for DELETE /pi-delegates/:pi_delegate_id (R-PID-004 AC.1, AC.2).
 *
 * Revoke targets the delegation row directly by its primary key
 * (pi_delegate_id), which is the minimal, unambiguous identifier —
 * no (project_id + delegate_user_id) pair needed.  The service performs a
 * soft-delete (is_active = 0, deleted_at = now) consistent with AuditableEntity
 * and the design's revoke semantics (design.md §4 "Revoke = soft-delete").
 *
 * pi_delegate_id is delivered via path param (@Param) in the controller,
 * not in the request body, so this DTO is a thin validation wrapper
 * matching the pattern used by similar soft-delete endpoints in the codebase.
 */
export class RevokePiDelegateDto {
  @ApiProperty({
    type: Number,
    description: 'Primary key of the pi_delegates row to revoke (soft-delete)',
    example: 7,
  })
  @IsNotEmpty()
  @IsInt()
  pi_delegate_id!: number;
}
