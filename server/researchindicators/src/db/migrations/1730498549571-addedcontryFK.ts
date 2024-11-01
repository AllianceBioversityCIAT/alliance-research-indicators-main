import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedcontryFK1730498549571 implements MigrationInterface {
  name = 'AddedcontryFK1730498549571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`FK_3b5e965129613725a0048539618\` ON \`result_countries\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` CHANGE \`country_id\` \`isoAlpha2\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD PRIMARY KEY (\`isoAlpha2\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP COLUMN \`code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP COLUMN \`isoAlpha2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD \`isoAlpha2\` varchar(3) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_locations\` ADD CONSTRAINT \`FK_8332e9b7269d91b8db571094096\` FOREIGN KEY (\`isoAlpha2\`) REFERENCES \`clarisa_countries\`(\`isoAlpha2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD CONSTRAINT \`FK_719b6cd4d416c7d97aab42c1d9f\` FOREIGN KEY (\`isoAlpha2\`) REFERENCES \`clarisa_countries\`(\`isoAlpha2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP FOREIGN KEY \`FK_719b6cd4d416c7d97aab42c1d9f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_locations\` DROP FOREIGN KEY \`FK_8332e9b7269d91b8db571094096\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP COLUMN \`isoAlpha2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD \`isoAlpha2\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD \`code\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD PRIMARY KEY (\`code\`, \`isoAlpha2\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` CHANGE \`isoAlpha2\` \`country_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`FK_3b5e965129613725a0048539618\` ON \`result_countries\` (\`country_id\`)`,
    );
  }
}
