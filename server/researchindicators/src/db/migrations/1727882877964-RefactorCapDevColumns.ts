import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorCapDevColumns1727882877964 implements MigrationInterface {
  name = 'RefactorCapDevColumns1727882877964';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` ADD \`trainee_name\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_capacity_sharing\` DROP COLUMN \`trainee_name\``,
    );
  }
}
