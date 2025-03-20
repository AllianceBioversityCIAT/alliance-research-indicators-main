import { MigrationInterface, QueryRunner } from 'typeorm';

export class WasModifyPrimaryKeyClarisaCountries1730498145117
  implements MigrationInterface
{
  name = 'WasModifyPrimaryKeyClarisaCountries1730498145117';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` DROP FOREIGN KEY \`FK_3b5e965129613725a0048539618\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_1712b5df6ba4801285ee11374f7\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_institution_locations\` (\`code\` bigint NOT NULL, \`name\` text NULL, \`institution_id\` bigint NOT NULL, \`isoAlpha2\` varchar(3) NOT NULL, \`isHeadquarter\` tinyint NULL, PRIMARY KEY (\`code\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`country_office_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`isoAlpha2\` \`isoAlpha2\` varchar(3) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD PRIMARY KEY (\`code\`, \`isoAlpha2\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_locations\` ADD CONSTRAINT \`FK_d7c26dfa9cf787a34975ea68d32\` FOREIGN KEY (\`institution_id\`) REFERENCES \`clarisa_institutions\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_locations\` DROP FOREIGN KEY \`FK_d7c26dfa9cf787a34975ea68d32\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`isoAlpha2\` \`isoAlpha2\` varchar(3) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` DROP PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` ADD PRIMARY KEY (\`code\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD \`country_office_id\` bigint NULL`,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_institution_locations\``);
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_1712b5df6ba4801285ee11374f7\` FOREIGN KEY (\`country_office_id\`) REFERENCES \`clarisa_countries\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries\` ADD CONSTRAINT \`FK_3b5e965129613725a0048539618\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
