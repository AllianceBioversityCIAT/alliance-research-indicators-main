// @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * Query parameters for GET /pi-delegates/by-user/projects and
 * GET /pi-delegates/by-user/people.
 *
 * Mirrors ListByDelegateDto (list-by-delegate.query.dto.ts): the same
 * @Type(() => Number) + @IsInt() + @IsNotEmpty() pattern is required because
 * query-string values arrive as strings and must be coerced before validation.
 */
export class ListManagedDto {
  @ApiProperty({
    type: Number,
    description:
      'sec_users.sec_user_id whose managed projects (PI or active delegate) to list',
    example: 42,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  user_id!: number;
}
