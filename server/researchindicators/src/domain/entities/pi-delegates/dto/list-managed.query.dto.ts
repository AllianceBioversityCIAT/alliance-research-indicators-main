// @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { PiDelegateScopeEnum } from '../enum/pi-delegate-scope.enum';

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

  @ApiPropertyOptional({
    enum: PiDelegateScopeEnum,
    default: PiDelegateScopeEnum.MANAGED,
    description:
      "Read scope. 'managed' (default) returns only the projects user_id manages " +
      "as PI or active delegate. 'all' returns EVERY project and EVERY active " +
      'delegation platform-wide and ignores user_id — reserved for SYSTEM_ADMIN ' +
      'and CENTER_ADMIN (403 for anyone else).',
    example: PiDelegateScopeEnum.ALL,
  })
  @IsOptional()
  @IsEnum(PiDelegateScopeEnum)
  scope?: PiDelegateScopeEnum;
}
