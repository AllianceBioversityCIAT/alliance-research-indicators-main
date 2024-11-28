import { ApiProperty } from '@nestjs/swagger';

export class SecUserContractDto {
  @ApiProperty({
    description: 'Is a unique identifier of the user role contract',
    example: 1,
  })
  sec_user_role_contract_id!: number;

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
