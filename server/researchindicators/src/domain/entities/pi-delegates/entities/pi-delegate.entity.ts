// @akili-spec docs/specs/changes/my-pi-delegates — T-02
//
// NOTE: `active_delegate_key` is a STORED GENERATED column in MySQL
// (IF(is_active=1, CONCAT(project_id,':',delegate_user_id), NULL)).
// It is intentionally NOT mapped here — TypeORM would attempt to write
// to it on INSERT/UPDATE and break every mutation. The unique-active
// constraint is enforced at the DB layer (uq_pi_delegates_active_delegate_key).
// Same pattern as `result_pool_funding_alignment` (D-PI-9).
//
// NOTE: `delegate_user_id` is a FK column pointing to `sec_users.sec_user_id`.
// `sec_users` has no TypeORM @Entity class in this codebase (it is used only
// as a plain DTO/query result), so the FK relationship is expressed as a plain
// @Column declaration — consistent with how every other entity in the codebase
// handles sec_users FKs.
// pi_user_id removed (redundant with created_by) — Product decision 2026-09-11
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AgressoContract } from '../../agresso-contract/entities/agresso-contract.entity';

@Entity('pi_delegates')
export class PiDelegate extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'pi_delegate_id',
    type: 'bigint',
  })
  pi_delegate_id!: number;

  @Column('varchar', {
    name: 'project_id',
    length: 36,
    nullable: false,
  })
  project_id!: string;

  @Column('bigint', {
    name: 'delegate_user_id',
    nullable: false,
  })
  delegate_user_id!: number;

  @ManyToOne(() => AgressoContract)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'agreement_id' })
  project!: AgressoContract;
}
