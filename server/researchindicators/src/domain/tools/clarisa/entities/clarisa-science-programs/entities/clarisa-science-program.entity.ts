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

  @Column('boolean', { default: true, name: 'is_active' })
  is_active!: boolean;
}
