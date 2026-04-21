import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateValidText1776373605381 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP FUNCTION IF EXISTS valid_text;
            `);
    await queryRunner.query(`
            CREATE FUNCTION \`valid_text\`(text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci) RETURNS tinyint(1)
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP FUNCTION IF EXISTS valid_text;
        `);
    await queryRunner.query(`
            CREATE FUNCTION \`valid_text\`(text TEXT) RETURNS tinyint(1)
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
  }
}
