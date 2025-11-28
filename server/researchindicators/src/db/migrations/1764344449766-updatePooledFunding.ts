import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePooledFunding1764344449766 implements MigrationInterface {
  name = 'UpdatePooledFunding1764344449766';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`pooled_funding_contracts\` CHANGE \`cgiar_entity_code\` \`cgiar_entity_code\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pooled_funding_contracts\` CHANGE \`cgiar_entity_name\` \`cgiar_entity_name\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`pooled_funding_contracts\` CHANGE \`cgiar_entity_name\` \`cgiar_entity_name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pooled_funding_contracts\` CHANGE \`cgiar_entity_code\` \`cgiar_entity_code\` text NOT NULL`,
    );
  }
}
