import { MigrationInterface, QueryRunner } from 'typeorm';

export class STARmvpGroupsItems1754918393274 implements MigrationInterface {
  name = 'STARmvpGroupsItems1754918393274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP FOREIGN KEY \`FK_cc811cd141dd58f44fe2fc4e8a4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD CONSTRAINT \`FK_cc811cd141dd58f44fe2fc4e8a4\` FOREIGN KEY (\`parent_id\`) REFERENCES \`groups_items\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` DROP FOREIGN KEY \`FK_cc811cd141dd58f44fe2fc4e8a4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`groups_items\` ADD CONSTRAINT \`FK_cc811cd141dd58f44fe2fc4e8a4\` FOREIGN KEY (\`parent_id\`) REFERENCES \`groups_items\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
