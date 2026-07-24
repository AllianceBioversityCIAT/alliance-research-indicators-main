import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates and seeds the `clarisa_science_programs` catalog with the 13 SPs
 * confirmed via CLARISA `/api/cgiar-entities` (filtered by type) and the
 * PRMS Reporting endpoint `/api/results/admin-panel/phases/6/reporting-initiatives`.
 *
 * Seed is intentionally static here; a periodic sync from CLARISA should
 * replace this seed when the SP catalog stabilizes upstream.
 */
export class CreateClarisaSciencePrograms1779190000010
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`clarisa_science_programs\` (
        \`official_code\` VARCHAR(20) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`category\` VARCHAR(50) NULL COMMENT 'Science programs | Scaling programs | Accelerators',
        \`color\` VARCHAR(20) NULL COMMENT 'Hex color for UI badge / icon background',
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (\`official_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
    `);

    await queryRunner.query(`
      INSERT INTO clarisa_science_programs (official_code, name, category, color, is_active) VALUES
        ('SP01', 'Breeding for Tomorrow',                  'Science programs', '#ef4444', TRUE),
        ('SP02', 'Sustainable Farming',                    'Science programs', '#84cc16', TRUE),
        ('SP03', 'Sustainable Animal and Aquatic Foods',   'Science programs', '#fb923c', TRUE),
        ('SP04', 'Multifunctional Landscapes',             'Science programs', '#10b981', TRUE),
        ('SP05', 'Better Diets and Nutrition',             'Science programs', '#92400e', TRUE),
        ('SP06', 'Climate Action',                         'Science programs', '#3b82f6', TRUE),
        ('SP07', 'Policy Innovations',                     'Science programs', '#06b6d4', TRUE),
        ('SP08', 'Food Frontiers and Security',            'Science programs', '#a855f7', TRUE),
        ('SP09', 'Scaling for Impact',                     'Scaling programs', '#ec4899', TRUE),
        ('SP10', 'Gender Equality and Inclusion',          'Accelerators',     '#8b5cf6', TRUE),
        ('SP11', 'Capacity Sharing',                       'Accelerators',     '#d946ef', TRUE),
        ('SP12', 'Digital Transformation',                 'Accelerators',     '#65a30d', TRUE),
        ('SP13', 'Genebank',                               'Accelerators',     '#f59e0b', TRUE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        color = VALUES(color),
        is_active = VALUES(is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`clarisa_science_programs\`;`,
    );
  }
}
