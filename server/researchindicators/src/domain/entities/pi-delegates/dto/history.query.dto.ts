// @akili-spec docs/specs/changes/my-pi-delegates-ui — history endpoint
//
// Query DTO for GET /pi-delegates/history.
// Exactly ONE of project_id or delegate_user_id must be supplied;
// the service enforces the mutual-exclusion rule and throws BadRequestException
// if both or neither are present.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PiDelegateScopeEnum } from '../enum/pi-delegate-scope.enum';

export class HistoryQueryDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Agresso agreement_id of the project whose full delegation history to return. ' +
      'Mutually exclusive with delegate_user_id — supply exactly one.',
    example: 'INIT-268',
  })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({
    type: Number,
    description:
      'sec_users.sec_user_id of the delegate whose history to return, scoped to ' +
      'projects the caller manages. Mutually exclusive with project_id — supply exactly one.',
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  delegate_user_id?: number;

  @ApiPropertyOptional({
    enum: PiDelegateScopeEnum,
    default: PiDelegateScopeEnum.MANAGED,
    description:
      'Read scope for the delegate_user_id branch only (the project_id branch is ' +
      "already gated per project). 'managed' (default) scopes the history to the " +
      "caller's own managed projects. 'all' returns the delegate's complete history " +
      'across every project — reserved for SYSTEM_ADMIN and CENTER_ADMIN (403 for ' +
      'anyone else).',
    example: PiDelegateScopeEnum.ALL,
  })
  @IsOptional()
  @IsEnum(PiDelegateScopeEnum)
  scope?: PiDelegateScopeEnum;
}
