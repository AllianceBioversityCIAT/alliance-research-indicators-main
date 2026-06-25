import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateImpactOutcomesTable1782418327772
  implements MigrationInterface
{
  name = 'CreateImpactOutcomesTable1782418327772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`impact_outcomes\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NULL, \`portfolio_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`impact_outcomes\` ADD CONSTRAINT \`FK_9bdaccc8dfdd1c2c716f9f5c06e\` FOREIGN KEY (\`portfolio_id\`) REFERENCES \`portfolios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`INSERT INTO \`impact_outcomes\` (name, portfolio_id) 
                            VALUES ('Unleashed Agrobiodiversity for Food, Climate and Nature', 2), 
                            ('Future-proofed Farms and Landscapes', 2),
                            ('Inclusive Food Economies', 2),
                            ('Healthy Diets for All', 2),
                            ('Leveraged Financing and Investment for Impact', 2);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`impact_outcomes\` DROP FOREIGN KEY \`FK_9bdaccc8dfdd1c2c716f9f5c06e\``,
    );
    await queryRunner.query(`DROP TABLE \`impact_outcomes\``);
  }
}
