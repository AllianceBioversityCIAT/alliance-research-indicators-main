// @akili-spec docs/specs/changes/my-pi-delegates — T-03
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/**
 * Identity object used when the delegate does not yet exist in sec_users.
 * Supplies the minimum fields needed by createUserInSecUsers (R-PID-005, OQ-D).
 */
export class DelegateIdentityDto {
  @ApiProperty({
    type: String,
    description:
      'Email address of the delegate (used as identity key in sec_users)',
    example: 'j.doe@cgiar.org',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    type: String,
    description: 'First name of the delegate',
    example: 'Jane',
  })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({
    type: String,
    description: 'Last name of the delegate',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  last_name!: string;
}

/**
 * Payload for POST /pi-delegates (R-PID-004, R-PID-005).
 *
 * Delegate identity is a union:
 *   - delegate_user_id  — reuse an existing sec_users row.
 *   - delegate          — provision a new sec_user via createUserInSecUsers.
 * At least one of the two MUST be present; supplying both is accepted and the
 * service will prefer delegate_user_id (lookup by ID) over the identity object.
 *
 * Cross-field "at least one" enforcement:
 *   The @ValidateIf decorators below make each field required when the other is
 *   absent. This is DTO-level — when both fields are omitted, class-validator
 *   fires on the @IsNotEmpty / @ValidateNested / @IsEmail checks, causing a 400
 *   before the service is reached (Done criterion).
 *   This repo has NO global ValidationPipe; validation is activated per-handler
 *   via @UsePipes(new ValidationPipe({...})) on the controller handler that
 *   accepts this DTO (pi-delegates.controller.ts — T-06).
 *   It is intentionally not a custom class-level validator so the error messages
 *   land on the specific field path rather than on the class root, matching the
 *   existing error vocabulary used across this codebase.
 */
export class CreatePiDelegateDto {
  @ApiProperty({
    type: String,
    description:
      'Agresso agreement ID of the project being delegated (FK → agresso_contracts.agreement_id)',
    example: 'INIT-268',
  })
  @IsString()
  @IsNotEmpty()
  project_id!: string;

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
  @ValidateIf((o: CreatePiDelegateDto) => o.delegate == null)
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
  @ValidateIf((o: CreatePiDelegateDto) => o.delegate_user_id == null)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DelegateIdentityDto)
  delegate?: DelegateIdentityDto;
}
