import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCapSharingDateType1779396908993
  implements MigrationInterface
{
  name = 'UpdateCapSharingDateType1779396908993';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`temp_start_date\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`temp_end_date\` text NULL`,
    );

    await queryRunner.query(`
      UPDATE \`result_capacity_sharing\`
      SET
        \`temp_start_date\` = \`start_date\`,
        \`temp_end_date\` = \`end_date\`
    `);

    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`start_date\` timestamp(6) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`end_date\` timestamp(6) NULL`,
    );

    const parseTempDate = (column: string) => `
      CASE
        WHEN ${column} IS NULL OR TRIM(${column}) = '' THEN NULL
        WHEN TRIM(${column}) = 'Invalid Date' THEN NULL
        WHEN ${column} REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN STR_TO_DATE(
          REPLACE(REPLACE(SUBSTRING_INDEX(TRIM(${column}), '.', 1), 'Z', ''), 'T', ' '),
          '%Y-%m-%d %H:%i:%s'
        )
        WHEN ${column} REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:' AND ${column} REGEXP '\\.[0-9]+' THEN STR_TO_DATE(
          TRIM(${column}),
          '%Y-%m-%d %H:%i:%s.%f'
        )
        WHEN ${column} REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:' THEN STR_TO_DATE(
          SUBSTRING(TRIM(${column}), 1, 19),
          '%Y-%m-%d %H:%i:%s'
        )
        WHEN ${column} REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN STR_TO_DATE(
          CONCAT(TRIM(${column}), ' 00:00:00'),
          '%Y-%m-%d %H:%i:%s'
        )
        WHEN ${column} REGEXP '^[A-Za-z]{3} [A-Za-z]{3} [0-9]{1,2} [0-9]{4}$' THEN STR_TO_DATE(
          CONCAT(DATE(STR_TO_DATE(TRIM(${column}), '%a %b %d %Y')), ' 00:00:00'),
          '%Y-%m-%d %H:%i:%s'
        )
        ELSE NULL
      END`;

    await queryRunner.query(`
      UPDATE \`result_capacity_sharing\`
      SET
        \`start_date\` = ${parseTempDate('`temp_start_date`')},
        \`end_date\` = ${parseTempDate('`temp_end_date`')}
    `);

    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`temp_end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`temp_start_date\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`temp_start_date\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`temp_end_date\` text NULL`,
    );

    const formatDateAsIso = (column: string) => `
      CASE
        WHEN ${column} IS NULL THEN NULL
        ELSE DATE_FORMAT(${column}, '%Y-%m-%d %H:%i:%s.%f')
      END`;

    await queryRunner.query(`
      UPDATE \`result_capacity_sharing\`
      SET
        \`temp_start_date\` = ${formatDateAsIso('`start_date`')},
        \`temp_end_date\` = ${formatDateAsIso('`end_date`')}
    `);

    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`end_date\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`start_date\` text NULL`,
    );

    await queryRunner.query(`
      UPDATE \`result_capacity_sharing\`
      SET
        \`start_date\` = \`temp_start_date\`,
        \`end_date\` = \`temp_end_date\`
    `);

    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`temp_end_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`temp_start_date\``,
    );
  }
}
