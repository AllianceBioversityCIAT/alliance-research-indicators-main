import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDefaultStatus1741783422528 implements MigrationInterface {
  name = 'UpdateDefaultStatus1741783422528';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_f2652ffd1160a8da41e32a439c5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` CHANGE \`result_status_id\` \`result_status_id\` bigint NULL DEFAULT '4'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_f2652ffd1160a8da41e32a439c5\` FOREIGN KEY (\`result_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP FOREIGN KEY \`FK_f2652ffd1160a8da41e32a439c5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` CHANGE \`result_status_id\` \`result_status_id\` bigint NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD CONSTRAINT \`FK_f2652ffd1160a8da41e32a439c5\` FOREIGN KEY (\`result_status_id\`) REFERENCES \`result_status\`(\`result_status_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
