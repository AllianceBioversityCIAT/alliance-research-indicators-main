// @akili-spec docs/specs/changes/my-pi-delegates — active_delegate_key removal + by-delegate endpoint (2026-09-11)
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * Query parameters for GET /pi-delegates/by-delegate.
 *
 * Returns all active pi_delegates rows where delegate_user_id matches the
 * given value — i.e. the list of projects a delegate is currently assigned to.
 *
 * @Type(() => Number) is required because query-string values arrive as strings;
 * the transform must run before @IsInt() validates. This follows the same pattern
 * as VerifyPiDelegateDto.delegate_user_id.
 */
export class ListByDelegateDto {
  @ApiProperty({
    type: Number,
    description:
      'sec_users.sec_user_id of the delegate whose project assignments to list',
    example: 42,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  delegate_user_id!: number;
}
