import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultEvidence } from '../../result-evidences/entities/result-evidence.entity';

@Entity('evidence_roles')
export class EvidenceRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'evidence_role_id',
    type: 'bigint',
  })
  evidence_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultEvidence,
    (resultEvidence) => resultEvidence.evidence_role,
  )
  result_evidences!: ResultEvidence[];
}
