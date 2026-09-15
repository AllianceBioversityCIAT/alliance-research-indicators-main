import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shape for a single active user returned by GET /api/users/active.
 *
 * CONTRACT (fixed — the frontend will call exactly this):
 *   ActiveUserResponseDto = { sec_user_id, first_name, last_name, email }
 */
export class ActiveUserResponseDto {
  @ApiProperty({
    description: 'Primary key of the user (sec_users.sec_user_id)',
    example: 42,
  })
  sec_user_id!: number;

  @ApiProperty({
    description: 'First name of the user; may be null for legacy rows',
    example: 'Jane',
    nullable: true,
  })
  first_name!: string | null;

  @ApiProperty({
    description: 'Last name of the user; may be null for legacy rows',
    example: 'Doe',
    nullable: true,
  })
  last_name!: string | null;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'j.doe@cgiar.org',
  })
  email!: string;
}
