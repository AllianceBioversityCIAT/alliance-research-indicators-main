import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultTag } from '../../result-tags/entities/result-tag.entity';

@Entity('tags')
export class Tag extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @OneToMany(() => ResultTag, (resultTag) => resultTag.tag)
  result_tags: ResultTag[];
}
