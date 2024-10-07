import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorNullableOptions1727394406550
  implements MigrationInterface
{
  name = 'RefactorNullableOptions1727394406550';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_geo_scope\` CHANGE \`name\` \`name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` CHANGE \`name\` \`name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`isoAlpha2\` \`isoAlpha2\` varchar(3) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`isoAlpha3\` \`isoAlpha3\` varchar(4) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`name\` \`name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`longitude\` \`longitude\` decimal(8,4) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`latitude\` \`latitude\` decimal(8,4) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` CHANGE \`code\` \`code\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` CHANGE \`name\` \`name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_languages\` CHANGE \`iso_alpha_2\` \`iso_alpha_2\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_languages\` CHANGE \`iso_alpha_3\` \`iso_alpha_3\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_types\` CHANGE \`name\` \`name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_c487f2dfe9069367da65076d0c4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` CHANGE \`name\` \`name\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` CHANGE \`added\` \`added\` timestamp NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` CHANGE \`institution_type_id\` \`institution_type_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_c487f2dfe9069367da65076d0c4\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_c487f2dfe9069367da65076d0c4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` CHANGE \`institution_type_id\` \`institution_type_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` CHANGE \`added\` \`added\` timestamp NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_c487f2dfe9069367da65076d0c4\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_institution_types\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_languages\` CHANGE \`iso_alpha_3\` \`iso_alpha_3\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_languages\` CHANGE \`iso_alpha_2\` \`iso_alpha_2\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` CHANGE \`code\` \`code\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`latitude\` \`latitude\` decimal(8,4) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`longitude\` \`longitude\` decimal(8,4) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`isoAlpha3\` \`isoAlpha3\` varchar(4) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries\` CHANGE \`isoAlpha2\` \`isoAlpha2\` varchar(3) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_geo_scope\` CHANGE \`name\` \`name\` text NOT NULL`,
    );
  }
}
