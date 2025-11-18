import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateNullableControlList1760713349516
  implements MigrationInterface
{
  name = 'UpdateNullableControlList1760713349516';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` CHANGE \`quantification_number\` \`quantification_number\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` CHANGE \`unit\` \`unit\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` DROP FOREIGN KEY \`FK_36365b324bdec8468c999cc6856\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` CHANGE \`notable_reference_type_id\` \`notable_reference_type_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` CHANGE \`link\` \`link\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` ADD CONSTRAINT \`FK_36365b324bdec8468c999cc6856\` FOREIGN KEY (\`notable_reference_type_id\`) REFERENCES \`notable_reference_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` DROP FOREIGN KEY \`FK_36365b324bdec8468c999cc6856\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` CHANGE \`link\` \`link\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` CHANGE \`notable_reference_type_id\` \`notable_reference_type_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` ADD CONSTRAINT \`FK_36365b324bdec8468c999cc6856\` FOREIGN KEY (\`notable_reference_type_id\`) REFERENCES \`notable_reference_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` CHANGE \`unit\` \`unit\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_quantifications\` CHANGE \`quantification_number\` \`quantification_number\` bigint NOT NULL`,
    );
  }
}
