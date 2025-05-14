import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { EvidenceRole } from '../../evidence-roles/entities/evidence-role.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Result } from '../../results/entities/result.entity';

@Entity('result_evidences')
export class ResultEvidence extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_evidence_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_evidence_id',
    type: 'bigint',
  })
  result_evidence_id!: number;

  @ApiProperty({
    type: Number,
    name: 'result_id',
  })
  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @ApiProperty({
    type: String,
    name: 'evidence_description',
  })
  @Column('text', {
    name: 'evidence_description',
    nullable: false,
  })
  evidence_description!: string;

  @ApiProperty({
    type: String,
    name: 'evidence_url',
  })
  @Column('text', {
    name: 'evidence_url',
    nullable: false,
  })
  evidence_url!: string;

  @ApiProperty({
    type: Number,
    name: 'evidence_role_id',
  })
  @Column('bigint', {
    name: 'evidence_role_id',
    nullable: false,
  })
  evidence_role_id!: number;

  @ApiProperty({
    type: Boolean,
    name: 'is_private',
  })
  @Column('boolean', {
    name: 'is_private',
    nullable: true,
    default: false,
  })
  is_private!: boolean;

  @ManyToOne(() => EvidenceRole, (role) => role.result_evidences)
  @JoinColumn({ name: 'evidence_role_id' })
  evidence_role!: EvidenceRole;

  @ManyToOne(() => Result, (result) => result.result_evidences)
  @JoinColumn({ name: 'result_id' })
  result!: Result;
}
