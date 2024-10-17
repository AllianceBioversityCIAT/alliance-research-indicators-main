import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorClarisaLevers1729116774732 implements MigrationInterface {
  name = 'RefactorClarisaLevers1729116774732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP FOREIGN KEY \`FK_e1fc97f82440f07c53e8b4876e8\``,
    );
    await queryRunner.query(`ALTER TABLE \`clarisa_levers\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`definition\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`id\` bigint NOT NULL PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`short_name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`full_name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP COLUMN \`lever_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD \`lever_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD CONSTRAINT \`FK_e1fc97f82440f07c53e8b4876e8\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP FOREIGN KEY \`FK_e1fc97f82440f07c53e8b4876e8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP COLUMN \`lever_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD \`lever_id\` varchar(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD CONSTRAINT \`FK_e1fc97f82440f07c53e8b4876e8\` FOREIGN KEY (\`lever_id\`) REFERENCES \`clarisa_levers\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`full_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`short_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` DROP COLUMN \`id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`definition\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD \`code\` varchar(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_levers\` ADD PRIMARY KEY (\`code\`)`,
    );
  }
}
