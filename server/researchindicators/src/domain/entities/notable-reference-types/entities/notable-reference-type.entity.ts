import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultNotableReference } from '../../result-notable-references/entities/result-notable-reference.entity';

@Entity('notable_reference_types')
export class NotableReferenceType extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @OneToMany(
    () => ResultNotableReference,
    (resultNotableReference) => resultNotableReference.notable_reference_type,
  )
  result_notable_references: ResultNotableReference[];
}
