// @akili-spec changes/profile-simulation
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/** R-IMP-002 `POST /api/impersonation/start` body. */
export class StartImpersonationDto {
  @ApiProperty({
    description: 'sec_users.sec_user_id of the account to simulate',
    example: 123,
  })
  @IsInt()
  @IsPositive()
  target_user_id!: number;

  @ApiPropertyOptional({
    description: 'Free-text justification for the simulation',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
