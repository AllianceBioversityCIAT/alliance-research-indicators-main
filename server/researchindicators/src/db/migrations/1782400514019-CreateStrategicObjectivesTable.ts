import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStrategicObjectivesTable1782400514019
  implements MigrationInterface
{
  name = 'CreateStrategicObjectivesTable1782400514019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`strategic_objectives\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NULL, \`portfolio_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`strategic_objectives\` ADD CONSTRAINT \`FK_f04a98abced7f5da968dcb0b89e\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`strategic_objectives\` (\`name\`, \`portfolio_id\`) VALUES ('Bank on Agrobiodiversity', 2)`,
    );
    await queryRunner.query(
      `INSERT INTO \`strategic_objectives\` (\`name\`, \`portfolio_id\`) VALUES ('Make Farms and Landscapes Thrive', 2)`,
    );
    await queryRunner.query(
      `INSERT INTO \`strategic_objectives\` (\`name\`, \`portfolio_id\`) VALUES ('Unlock Climate Action', 2)`,
    );
    await queryRunner.query(
      `INSERT INTO \`strategic_objectives\` (\`name\`, \`portfolio_id\`) VALUES ('Enable Healthy Food Choices', 2)`,
    );
    await queryRunner.query(
      `INSERT INTO \`strategic_objectives\` (\`name\`, \`portfolio_id\`) VALUES ('Boost Inclusion and Prosperity', 2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`strategic_objectives\` DROP FOREIGN KEY \`FK_f04a98abced7f5da968dcb0b89e\``,
    );
    await queryRunner.query(`DROP TABLE \`strategic_objectives\``);
  }
}
