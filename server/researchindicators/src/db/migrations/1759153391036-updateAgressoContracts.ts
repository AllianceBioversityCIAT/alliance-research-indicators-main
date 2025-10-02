import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAgressoContracts1759153391036 implements MigrationInterface {
  name = 'UpdateAgressoContracts1759153391036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`programAssistantId\` varchar(15) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`programAssistantName\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`projectLeadId\` varchar(15) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`researchAssistantName\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` ADD \`researchAssistantId\` varchar(15) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`researchAssistantId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`researchAssistantName\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`projectLeadId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`programAssistantName\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agresso_contracts\` DROP COLUMN \`programAssistantId\``,
    );
  }
}
