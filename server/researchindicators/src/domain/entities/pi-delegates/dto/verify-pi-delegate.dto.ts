// @akili-spec docs/specs/changes/my-pi-delegates — T-03
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters for GET /pi-delegates/verify (R-PID-004 AC.1).
 *
 * Answers whether an active delegation exists for the given
 * (project_id, delegate_user_id) pair, without exposing full row data.
 * Both fields are required — an incomplete pair is meaningless and
 * rejected with 400 by the global ValidationPipe.
 *
 * @Type(() => Number) on delegate_user_id follows the query-DTO pattern in
 * ListBilateralProjectMappingsQueryDto: query-string values arrive as strings,
 * so the transform is needed before @IsInt() runs.
 */
export class VerifyPiDelegateDto {
  @ApiProperty({
    type: String,
    description: 'Agresso agreement ID of the project to check',
    example: 'INIT-268',
  })
  @IsString()
  @IsNotEmpty()
  project_id!: string;

  @ApiProperty({
    type: Number,
    description:
      'sec_users.sec_user_id of the user whose delegation is being verified',
    example: 42,
  })
  @Type(() => Number)
  @IsInt()
  delegate_user_id!: number;
}
