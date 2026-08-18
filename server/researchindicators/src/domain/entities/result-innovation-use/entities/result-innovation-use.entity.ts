import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInnovationUseLevel } from '../../../tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';

/**
 * T-08 (R-IU-001, NFR-IU-002) — Innovation Use detail record entity.
 *
 * Mirrors `ResultInnovationDev`'s shape and matches migration M2
 * (`1787068132517-createResultInnovationUse.ts`) column-for-column.
 * `result_id` is BOTH the primary key and the FK to `results` — there is no
 * surrogate `id`, so a duplicate active row is structurally impossible
 * (R-IU-001's negative constraint is enforced by the schema, not by
 * application code). `@PrimaryGeneratedColumn` would be wrong here: this
 * column is not AUTO_INCREMENT.
 *
 * FK constraint names are pinned to the ones M2 hand-named
 * (`FK_result_innovation_use_result_id`,
 * `FK_result_innovation_use_innovation_use_level_id`) via
 * `foreignKeyConstraintName` (FP-10). TypeORM 0.3.20's schema builder
 * matches existing FKs by NAME only, never by structure
 * (`DefaultNamingStrategy.js:81-89` synthesizes
 * `"FK_" + sha1(table_sortedColumns).substr(0,27)` when no name is given).
 * Without pinning, `migration:generate` would compute a different
 * synthesized name than M2's hand-written one and propose a perpetual
 * drop-then-re-add. Do NOT remove these — the sibling
 * `result-innovation-dev.entity.ts` pins no constraint name because its FKs
 * were never hand-named; that precedent does not apply here.
 */
@Entity('result_innovation_use')
export class ResultInnovationUse extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'innovation_use_level_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_use_level_id?: number;

  @Column({
    name: 'innovation_use_level_explanation',
    type: 'text',
    nullable: true,
  })
  innovation_use_level_explanation?: string;

  @ManyToOne(() => Result, (result) => result.result_innovation_use)
  @JoinColumn({
    name: 'result_id',
    foreignKeyConstraintName: 'FK_result_innovation_use_result_id',
  })
  result?: Result;

  @ManyToOne(
    () => ClarisaInnovationUseLevel,
    (level) => level.result_innovation_use,
  )
  @JoinColumn({
    name: 'innovation_use_level_id',
    foreignKeyConstraintName:
      'FK_result_innovation_use_innovation_use_level_id',
  })
  innovation_use_level?: ClarisaInnovationUseLevel;
}
