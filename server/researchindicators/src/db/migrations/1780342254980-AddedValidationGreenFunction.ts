import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedValidationGreenFunction1780342254980
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`result_status_workflow\` SET config = ? WHERE id = ?`,
      [
        JSON.stringify({
          actions: [
            {
              type: 'validation',
              config: { function_name: 'completenessValidation' },
              enabled: true,
            },
          ],
        }),
        37,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`result_status_workflow\` SET config = NULL WHERE id = ?`,
      [37],
    );
  }
}
