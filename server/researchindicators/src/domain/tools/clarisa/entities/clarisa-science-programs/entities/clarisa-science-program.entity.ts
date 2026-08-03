import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Cached catalog of CGIAR Science Programs / Accelerators (the 2025+ portfolio
 * top-level entities). Sourced from CLARISA's `/api/cgiar-entities` filtered by
 * `cgiarEntityTypeDTO.name IN ('Science programs', 'Scaling programs', 'Accelerators')`
 * — deduped by `official_code` (latest year wins).
 *
 * Currently seeded by migration. A periodic sync from CLARISA cgiar-entities
 * should be added when the SP catalog stabilizes (TODO — see clarisa.service.ts
 * pattern for cloneAllControlList).
 */
@Entity('clarisa_science_programs')
export class ClarisaScienceProgram {
  @PrimaryColumn('varchar', { length: 20, name: 'official_code' })
  official_code!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', {
    length: 50,
    nullable: true,
    comment: 'Science programs | Scaling programs | Accelerators',
  })
  category?: string;

  @Column('varchar', {
    length: 20,
    nullable: true,
    comment: 'Hex color for UI badge / icon background',
  })
  color?: string;

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.4 / R-BIL-074
  // Stable FE asset key. Seeded to `official_code` for the 13 catalog rows so
  // the FE resolves `/assets/.../SPs-Icons/${icon_key}.png` without per-SP
  // overrides. Nullable to keep the catalog live during rollout.
  @Column('varchar', {
    length: 64,
    nullable: true,
    name: 'icon_key',
    comment: 'Stable FE asset key — defaults to official_code',
  })
  icon_key?: string | null;

  @Column('boolean', { default: true, name: 'is_active' })
  is_active!: boolean;
}
