import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndicatorTypes1727207856798 implements MigrationInterface {
  name = 'CreateIndicatorTypes1727207856798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`indicator_types\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`indicator_type_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`indicator_type_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD \`indicator_type_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` ADD CONSTRAINT \`FK_ea5d3ef0297d7f3802c260e232d\` FOREIGN KEY (\`indicator_type_id\`) REFERENCES \`indicator_types\`(\`indicator_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP FOREIGN KEY \`FK_ea5d3ef0297d7f3802c260e232d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`indicators\` DROP COLUMN \`indicator_type_id\``,
    );
    await queryRunner.query(`DROP TABLE \`indicator_types\``);
  }
}
