import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Raises report_field / valid_text from TEXT (~64 KiB) to MEDIUMTEXT (16 MiB) so
 * GROUP_CONCAT-heavy report views (export phase 2) do not fail with
 * "Data too long for column 'data_field'".
 */
export class ExpandReportFieldMediumtext1779920000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`report_field\``);
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`valid_text\``);

    await queryRunner.query(`
      CREATE FUNCTION \`valid_text\`(
        text MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      ) RETURNS tinyint(1)
        READS SQL DATA
        DETERMINISTIC
      BEGIN
        RETURN IF(
          text IS NOT NULL,
          LENGTH(TRIM(REGEXP_REPLACE(text, '\\\\s+', ''))) > 0,
          FALSE
        );
      END
    `);

    await queryRunner.query(`
      CREATE FUNCTION \`report_field\`(
        data_field MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        mandatory BOOLEAN,
        applies BOOLEAN
      ) RETURNS mediumtext CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
      BEGIN
        DECLARE has_content BOOLEAN DEFAULT FALSE;
        SET has_content = IFNULL(valid_text(data_field), FALSE);
        IF NOT COALESCE(applies, TRUE) THEN
          RETURN 'Not applicable';
        END IF;
        IF COALESCE(mandatory, FALSE) AND NOT has_content THEN
          RETURN 'Not provided';
        END IF;
        IF NOT COALESCE(mandatory, FALSE) AND NOT has_content THEN
          RETURN 'Not mandatory';
        END IF;
        RETURN data_field;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`report_field\``);
    await queryRunner.query(`DROP FUNCTION IF EXISTS \`valid_text\``);

    await queryRunner.query(`
      CREATE FUNCTION \`valid_text\`(
        text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      ) RETURNS tinyint(1)
        READS SQL DATA
        DETERMINISTIC
      BEGIN
        RETURN IF(
          text IS NOT NULL,
          LENGTH(TRIM(REGEXP_REPLACE(text, '\\\\s+', ''))) > 0,
          FALSE
        );
      END
    `);

    await queryRunner.query(`
      CREATE FUNCTION \`report_field\`(
        data_field TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        mandatory BOOLEAN,
        applies BOOLEAN
      ) RETURNS text CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci
      BEGIN
        DECLARE has_content BOOLEAN DEFAULT FALSE;
        SET has_content = IFNULL(valid_text(data_field), FALSE);
        IF NOT COALESCE(applies, TRUE) THEN
          RETURN 'Not applicable';
        END IF;
        IF COALESCE(mandatory, FALSE) AND NOT has_content THEN
          RETURN 'Not provided';
        END IF;
        IF NOT COALESCE(mandatory, FALSE) AND NOT has_content THEN
          RETURN 'Not mandatory';
        END IF;
        RETURN data_field;
      END
    `);
  }
}
