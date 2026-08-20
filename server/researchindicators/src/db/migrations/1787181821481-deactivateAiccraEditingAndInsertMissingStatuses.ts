import { MigrationInterface, QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';

/** Historical AICCRA seed row; unused. Not in ResultStatusEnum. Must not be deleted. */
const AICCRA_EDITING_STATUS_ID = 21;

const COMPLETED_STYLE =
  '{"color":{"border":"#7CB580","text":"#358540","background":null},"icon":{"color":"#358540","name":"pi pi-exclamation-circle"},"image":null}';
const EXTENDED_STYLE =
  '{"color":{"border":"#E69F00","text":"#F58220","background":null},"icon":{"color":"#F58220","name":"pi pi-exclamation-circle"},"image":null}';
const ON_GOING_STYLE =
  '{"color":{"border":"#79D9FF","text":"#1689CA","background":null},"icon":{"color":"#1689CA","name":"pi pi-exclamation-circle"},"image":null}';

export class DeactivateAiccraEditingAndInsertMissingStatuses1787181821481
  implements MigrationInterface
{
  name = 'DeactivateAiccraEditingAndInsertMissingStatuses1787181821481';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`result_status\` SET \`is_active\` = 0 WHERE \`result_status_id\` = ?`,
      [AICCRA_EDITING_STATUS_ID],
    );

    await queryRunner.query(
      `INSERT INTO \`result_status\` (\`result_status_id\`, \`name\`, \`description\`, \`editable_roles\`, \`config\`) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [
        ResultStatusEnum.COMPLETED_IN_AICCRA,
        'Completed in AICCRA',
        'The result has been successfully finalized in MARLO-AICCRA.',
        null,
        COMPLETED_STYLE,
        ResultStatusEnum.EXTENDED_IN_AICCRA,
        'Extended in AICCRA',
        'The result timeline has been extended in MARLO-AICCRA.',
        null,
        EXTENDED_STYLE,
        ResultStatusEnum.ON_GOING_IN_AICCRA,
        'On Going in AICCRA',
        'The result is currently on going in MARLO-AICCRA.',
        null,
        ON_GOING_STYLE,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`result_status\` WHERE \`result_status_id\` IN (?, ?, ?)`,
      [
        ResultStatusEnum.COMPLETED_IN_AICCRA,
        ResultStatusEnum.EXTENDED_IN_AICCRA,
        ResultStatusEnum.ON_GOING_IN_AICCRA,
      ],
    );

    await queryRunner.query(
      `UPDATE \`result_status\` SET \`is_active\` = 1 WHERE \`result_status_id\` = ?`,
      [AICCRA_EDITING_STATUS_ID],
    );
  }
}
