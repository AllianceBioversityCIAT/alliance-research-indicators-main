import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('announcement_settings')
export class AnnouncementSetting extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  announcement_id: number;

  @Column({
    type: 'text',
    nullable: true,
    name: 'title',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'description',
  })
  description: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'src',
  })
  src: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'link',
  })
  link: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'start_date',
  })
  start_date: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'end_date',
  })
  end_date: Date;
}
