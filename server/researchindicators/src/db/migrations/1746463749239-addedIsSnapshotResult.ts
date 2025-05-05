import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIsSnapshotResult1746463749239 implements MigrationInterface {
  name = 'AddedIsSnapshotResult1746463749239';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`is_snapshot\` tinyint NULL`,
    );
    await queryRunner.query(`UPDATE \`results\` SET \`is_snapshot\` = 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`is_snapshot\``,
    );
  }
}
