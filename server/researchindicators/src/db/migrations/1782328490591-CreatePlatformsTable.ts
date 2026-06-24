import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformsTable1782328490591 implements MigrationInterface {
  name = 'CreatePlatformsTable1782328490591';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`portfolios\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`start_year\` int NOT NULL, \`end_year\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `INSERT INTO \`portfolios\` (\`name\`, \`description\`, \`start_year\`, \`end_year\`) VALUES ('Portfolio 1', 'Description 1', 2021, 2025)`,
    );
    await queryRunner.query(
      `INSERT INTO \`portfolios\` (\`name\`, \`description\`, \`start_year\`, \`end_year\`) VALUES ('Portfolio 2', 'Description 2', 2026, 2030)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`portfolios\``);
  }
}
