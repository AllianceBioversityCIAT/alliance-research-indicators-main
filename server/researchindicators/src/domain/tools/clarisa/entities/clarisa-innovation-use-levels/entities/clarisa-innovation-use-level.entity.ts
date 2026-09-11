import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultInnovationUse } from '../../../../../entities/result-innovation-use/entities/result-innovation-use.entity';

/**
 * T-08 (R-IU-002, NFR-IU-003) — Innovation Use level catalog entity.
 *
 * Mirrors `ClarisaInnovationReadinessLevel`'s shape and matches migration M1
 * (`1787066437593-createClarisaInnovationUseLevels.ts`) column-for-column:
 * `id` is the PK and is NOT auto-increment (M1 seeds explicit ids), plus
 * `level`, `name`, `definition`. No `additional_guidance` column — the
 * source system supplies no equivalent field for this catalog and an
 * always-null column would be noise (design.md §3.2).
 *
 * `id` is NOT the scale point: `id = level + 1` (DD-3). Every business rule
 * must compare `level`, reached by joining on `id`, never the FK directly.
 */
@Entity('clarisa_innovation_use_levels')
export class ClarisaInnovationUseLevel extends AuditableEntity {
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'level',
    type: 'bigint',
    nullable: true,
  })
  level?: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name?: string;

  @Column({
    name: 'definition',
    type: 'text',
    nullable: true,
  })
  definition?: string;

  @OneToMany(
    () => ResultInnovationUse,
    (resultInnovationUse) => resultInnovationUse.innovation_use_level,
  )
  result_innovation_use?: ResultInnovationUse[];
}
