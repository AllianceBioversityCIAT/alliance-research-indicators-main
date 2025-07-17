import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('app_config')
export class AppConfig extends AuditableEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @ApiProperty()
  @Column({
    type: 'text',
    nullable: true,
    name: 'description',
  })
  description: string;

  @ApiProperty()
  @Column({
    type: 'text',
    nullable: true,
    name: 'simple_value',
  })
  simple_value: string;

  @ApiProperty()
  @Column({
    type: 'json',
    nullable: true,
    name: 'json_value',
  })
  json_value: any;
}
