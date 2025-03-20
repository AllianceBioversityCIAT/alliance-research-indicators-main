import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorResultContract1726506224435 implements MigrationInterface {
  name = 'RefactorResultContract1726506224435';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP FOREIGN KEY \`FK_4b8eb4ce310754d6fd971f47157\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP COLUMN \`contract_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD \`contract_id\` varchar(36) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD CONSTRAINT \`FK_4b8eb4ce310754d6fd971f47157\` FOREIGN KEY (\`contract_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP FOREIGN KEY \`FK_4b8eb4ce310754d6fd971f47157\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` DROP COLUMN \`contract_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD \`contract_id\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_contracts\` ADD CONSTRAINT \`FK_4b8eb4ce310754d6fd971f47157\` FOREIGN KEY (\`contract_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
