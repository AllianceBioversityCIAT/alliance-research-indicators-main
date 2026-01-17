import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePublicLinkColumnResult1768686422183
  implements MigrationInterface
{
  name = 'UpdatePublicLinkColumnResult1768686422183';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` CHANGE \`document_link\` \`public_link\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` CHANGE \`public_link\` \`document_link\` text NULL`,
    );
  }
}
