import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetFktoClarisaSubNationals1732823878957
  implements MigrationInterface
{
  name = 'SetFktoClarisaSubNationals1732823878957';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` CHANGE \`definition\` \`country_iso_alpha_2\` varchar(3) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` ADD CONSTRAINT \`FK_182bec9487d08d6779c7004443e\` FOREIGN KEY (\`country_iso_alpha_2\`) REFERENCES \`clarisa_countries\`(\`isoAlpha2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` DROP FOREIGN KEY \`FK_182bec9487d08d6779c7004443e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_sub_nationals\` CHANGE \`country_iso_alpha_2\` \`definition\` varchar(3) NULL`,
    );
  }
}
