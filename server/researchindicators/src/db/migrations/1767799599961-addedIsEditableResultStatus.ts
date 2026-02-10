import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedIsEditableResultStatus1767799599961
  implements MigrationInterface
{
  name = 'AddedIsEditableResultStatus1767799599961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`FK_9bb0e4bcdbb9b2832692d987dfd\` ON \`result_status_transitions\``,
    );
    await queryRunner.query(
      `DROP INDEX \`FK_fa2fe18b46e867b6f36e9f4df69\` ON \`result_status_transitions\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_status\` ADD \`is_editable\` tinyint NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status\` DROP COLUMN \`is_editable\``,
    );
    await queryRunner.query(
      `CREATE INDEX \`FK_fa2fe18b46e867b6f36e9f4df69\` ON \`result_status_transitions\` (\`to_status_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`FK_9bb0e4bcdbb9b2832692d987dfd\` ON \`result_status_transitions\` (\`from_status_id\`)`,
    );
  }
}
