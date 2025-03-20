import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserContract1724872525861 implements MigrationInterface {
  name = 'CreateUserContract1724872525861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`user_agresso_contract\` (\`user_agresso_contract_id\` bigint NOT NULL AUTO_INCREMENT, \`agreement_id\` varchar(36) NOT NULL, \`user_id\` bigint NOT NULL, INDEX \`user_agresso_contract_pkey\` (\`agreement_id\`, \`user_id\`), PRIMARY KEY (\`user_agresso_contract_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_agresso_contract\` ADD CONSTRAINT \`FK_cca0330a53abf0648e997929081\` FOREIGN KEY (\`agreement_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_agresso_contract\` DROP FOREIGN KEY \`FK_cca0330a53abf0648e997929081\``,
    );
    await queryRunner.query(
      `DROP INDEX \`user_agresso_contract_pkey\` ON \`user_agresso_contract\``,
    );
    await queryRunner.query(`DROP TABLE \`user_agresso_contract\``);
  }
}
