import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomLeverNameInResultLever1782232087461
  implements MigrationInterface
{
  name = 'AddCustomLeverNameInResultLever1782232087461';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` ADD \`custom_lever_name\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_levers\` DROP COLUMN \`custom_lever_name\``,
    );
  }
}
