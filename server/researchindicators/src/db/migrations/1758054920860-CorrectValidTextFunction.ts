import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectValidTextFunction1758054920860
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS valid_text;
    `);

    await queryRunner.query(`
      CREATE FUNCTION valid_text(text TEXT) RETURNS tinyint(1)
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
      CREATE FUNCTION valid_text(text TEXT) RETURNS tinyint(1)
        READS SQL DATA
        DETERMINISTIC
        BEGIN
            RETURN IF(text IS NOT NULL, LENGTH(TRIM(text)) > 0, FALSE);
        END
    `);
  }
}
