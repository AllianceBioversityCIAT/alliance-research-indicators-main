import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sec_users')
export class User extends AuditableEntity {
  @ApiProperty({
    example: 1,
    description: 'User ID',
    type: Number,
  })
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'sec_user_id',
  })
  sec_user_id: number;

  @ApiProperty({
    example: 'John',
    description: 'First name',
    type: String,
  })
  @Column({
    type: 'varchar',
    name: 'first_name',
    length: 60,
  })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
    type: String,
  })
  @Column({
    type: 'varchar',
    name: 'last_name',
    length: 60,
  })
  last_name: string;

  @ApiProperty({
    example: 'jhon-doe@email.com',
    description: 'Email',
    type: String,
    required: false,
  })
  @Column({
    type: 'varchar',
    name: 'email',
    length: 150,
  })
  email: string;
}
