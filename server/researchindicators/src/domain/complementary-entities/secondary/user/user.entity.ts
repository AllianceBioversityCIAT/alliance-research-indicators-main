import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ApiProperty } from '@nestjs/swagger';

export class User extends AuditableEntity {
  @ApiProperty({
    example: 1,
    description: 'User ID',
    type: Number,
  })
  sec_user_id: number;

  @ApiProperty({
    example: 'John',
    description: 'First name',
    type: String,
  })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
    type: String,
  })
  last_name: string;

  @ApiProperty({
    example: 'jhon-doe@email.com',
    description: 'Email',
    type: String,
    required: false,
  })
  email: string;
}
