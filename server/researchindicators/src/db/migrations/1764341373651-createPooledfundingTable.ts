import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePooledfundingTable1764341373651
  implements MigrationInterface
{
  name = 'CreatePooledfundingTable1764341373651';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`pooled_funding_contracts\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`agreement_id\` varchar(36) NOT NULL, \`cgiar_entity_code\` text NOT NULL, \`cgiar_entity_name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pooled_funding_contracts\` ADD CONSTRAINT \`FK_7b48a2e3bf656efd12ac188a845\` FOREIGN KEY (\`agreement_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`pooled_funding_contracts\` DROP FOREIGN KEY \`FK_7b48a2e3bf656efd12ac188a845\``,
    );
    await queryRunner.query(`DROP TABLE \`pooled_funding_contracts\``);
  }
}
