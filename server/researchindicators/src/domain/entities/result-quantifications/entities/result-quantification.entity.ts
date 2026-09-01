import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  ValueTransformer,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { QuantificationRole } from '../../quantification-roles/entities/quantification-role.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @sdd-spec docs/specs/changes/measure-number-signed-decimal — T-02 / DD-1, DD-2
 *
 * MySQL's driver hydrates `DECIMAL`/`NEWDECIMAL` columns as a **string**
 * (design.md §5.4) — unlike `bigint`, which mysql2 already decodes to a
 * `number`. Without this transformer an untouched row resends that string
 * verbatim and either `400`s (Innovation Use validation) or stops matching
 * `base-service.ts`'s `String(value)` composite key, silently deactivating
 * the row and inserting a duplicate (OICR, design.md §5.3).
 *
 * `null` MUST map to `null` in both directions, never `0` — TypeORM applies
 * `to`/`from` to `null`/`undefined` unconditionally, before any type branch
 * (`MysqlDriver.js` `preparePersistentValue` / `prepareHydratedValue`), so a
 * naive `Number(v)` on either side would turn an absent measure into `0`.
 * `to` is not a no-op: `upsertByCompositeKeys` re-saves hydrated entities,
 * so `to` runs on every save of an unchanged row, including one whose value
 * is `null`.
 */
export const quantificationNumberTransformer: ValueTransformer = {
  to: (value?: number | null): number | null =>
    value === null || value === undefined ? null : value,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};

@Entity('result_quantifications')
export class ResultQuantification extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'decimal',
    name: 'quantification_number',
    precision: 24,
    scale: 4,
    nullable: true,
    transformer: quantificationNumberTransformer,
  })
  @ApiProperty()
  quantification_number: number | null;

  @Column({
    type: 'text',
    name: 'unit',
    nullable: true,
  })
  @ApiProperty()
  unit: string;

  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
  })
  @ApiProperty()
  description: string;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'quantification_role_id',
  })
  quantification_role_id: number;

  @ManyToOne(() => Result, (result) => result.result_quantifications)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => QuantificationRole,
    (quantificationRole) => quantificationRole.result_quantifications,
  )
  @JoinColumn({ name: 'quantification_role_id' })
  quantification_role: QuantificationRole;
}
