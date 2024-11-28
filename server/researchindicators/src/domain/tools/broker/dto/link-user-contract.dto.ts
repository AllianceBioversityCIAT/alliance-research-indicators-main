import { ApiProperty } from '@nestjs/swagger';

export class LinkUserRoleContractDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  user_id!: number;

  @ApiProperty({
    description: 'Role ID',
    example: 1,
  })
  role_id!: number;

  @ApiProperty({
    description: 'Contract ID',
    example: '0000',
  })
  contract_id!: string;
}
