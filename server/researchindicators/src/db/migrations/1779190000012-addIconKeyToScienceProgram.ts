import { MigrationInterface, QueryRunner } from 'typeorm';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.4 / R-BIL-074
//
// Adds a stable per-SP key the FE uses to resolve bundled SP icons. Seeded to
// `official_code` for the 13 catalog rows so today's `/assets/.../SPs-Icons/SPxx.png`
// asset pattern keeps working unchanged. Column is nullable so the catalog
// can stay live during rollout.
export class AddIconKeyToScienceProgram1779190000012
  implements MigrationInterface
{
  name = 'AddIconKeyToScienceProgram1779190000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_science_programs\`
       ADD COLUMN \`icon_key\` varchar(64) NULL
       COMMENT 'Stable FE asset key — defaults to official_code'`,
    );
    await queryRunner.query(
      `UPDATE \`clarisa_science_programs\`
       SET \`icon_key\` = \`official_code\`
       WHERE \`icon_key\` IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_science_programs\` DROP COLUMN \`icon_key\``,
    );
  }
}
