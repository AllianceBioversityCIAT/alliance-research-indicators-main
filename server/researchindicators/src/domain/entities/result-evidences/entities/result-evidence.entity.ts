import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { EvidenceRole } from '../../evidence-roles/entities/evidence-role.entity';

@Entity('result_evidences')
export class ResultEvidence extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_evidence_id',
    type: 'bigint',
  })
  result_evidence_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('text', {
    name: 'evidence_description',
    nullable: false,
  })
  evidence_description!: string;

  @Column('text', {
    name: 'evidence_url',
    nullable: false,
  })
  evidence_url!: string;

  @Column('bigint', {
    name: 'evidence_role_id',
    nullable: false,
  })
  evidence_role_id!: number;

  @ManyToOne(() => EvidenceRole, (role) => role.result_evidences)
  @JoinColumn({ name: 'evidence_role_id' })
  evidence_role!: EvidenceRole;
}
