// @akili-spec changes/profile-simulation
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/**
 * R-IMP-001 `GET /api/impersonation/users`. `search` is trimmed before
 * length validation so `"  ro  "` (5 raw chars, 2 trimmed) is correctly
 * rejected rather than accidentally passing on whitespace padding.
 */
export class SearchUsersDto {
  @ApiProperty({
    description:
      'Search text matched (case-insensitive) against email, first name and last name',
    minLength: 3,
    maxLength: 100,
    example: 'rojas',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 100)
  search!: string;
}
