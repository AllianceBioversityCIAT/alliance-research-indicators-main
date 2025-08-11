import { MigrationInterface, QueryRunner } from 'typeorm';

export class STARmvpProjectIndicatorsStructure1754662943589
  implements MigrationInterface
{
  name = 'STARmvpProjectIndicatorsStructure1754662943589';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP FOREIGN KEY \`FK_9b2e25133612087c8a54939b285\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`group_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD COLUMN \`parent_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD CONSTRAINT \`FK_cc811cd141dd58f44fe2fc4e8a4\` FOREIGN KEY (\`parent_id\`) REFERENCES \`groups_items\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP FOREIGN KEY \`FK_cc811cd141dd58f44fe2fc4e8a4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP COLUMN \`parent_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD CONSTRAINT \`FK_9b2e25133612087c8a54939b285\` FOREIGN KEY (\`group_id\`) REFERENCES \`project_groups\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
