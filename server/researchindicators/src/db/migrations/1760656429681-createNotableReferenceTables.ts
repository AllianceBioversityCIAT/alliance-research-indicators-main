import { MigrationInterface, QueryRunner } from 'typeorm';
import { NotableReferenceTypeEnum } from '../../domain/entities/notable-reference-types/enum/notable-reference.enum';

export class CreateNotableReferenceTables1760656429681
  implements MigrationInterface
{
  name = 'CreateNotableReferenceTables1760656429681';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`notable_reference_types\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_notable_references\` (\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`deleted_at\` timestamp NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`notable_reference_type_id\` bigint NOT NULL, \`link\` text NOT NULL, \`result_id\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` ADD CONSTRAINT \`FK_8240397f70df29ad780857bc0be\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` ADD CONSTRAINT \`FK_36365b324bdec8468c999cc6856\` FOREIGN KEY (\`notable_reference_type_id\`) REFERENCES \`notable_reference_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO \`notable_reference_types\` (\`id\`,\`name\`) VALUES (${NotableReferenceTypeEnum.COMMUNICATION_MATERIALS}, 'Communication materials'), (${NotableReferenceTypeEnum.PROMOTIONAL_PRODUCTS}, 'Promotional products'), (${NotableReferenceTypeEnum.REFERENCES}, 'References'), (${NotableReferenceTypeEnum.OTHER}, 'Other')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` DROP FOREIGN KEY \`FK_36365b324bdec8468c999cc6856\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_notable_references\` DROP FOREIGN KEY \`FK_8240397f70df29ad780857bc0be\``,
    );
    await queryRunner.query(`DROP TABLE \`result_notable_references\``);
    await queryRunner.query(`DROP TABLE \`notable_reference_types\``);
  }
}
