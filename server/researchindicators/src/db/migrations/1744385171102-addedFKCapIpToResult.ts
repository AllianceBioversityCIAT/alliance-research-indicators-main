import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedFKCapIpToResult1744385171102 implements MigrationInterface {
  name = 'AddedFKCapIpToResult1744385171102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` ADD CONSTRAINT \`FK_edaef5d259ac93f16c555baec82\` FOREIGN KEY (\`result_cap_sharing_ip_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_cap_sharing_ip\` DROP FOREIGN KEY \`FK_edaef5d259ac93f16c555baec82\``,
    );
  }
}
