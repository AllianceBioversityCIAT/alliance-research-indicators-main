import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Query parameters for GET /api/users/active.
 */
export class SearchActiveUsersQueryDto {
  @ApiPropertyOptional({
    description:
      'Optional name or email filter. When provided, matches against ' +
      'first_name, last_name, or email (case-insensitive LIKE).',
    example: 'jane',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
