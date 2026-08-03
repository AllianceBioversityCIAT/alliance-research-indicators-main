import { MigrationInterface, QueryRunner } from 'typeorm';

const BILATERAL_PENDING_REVIEW = 23;
const BILATERAL_APPROVED = 24;
const BILATERAL_REJECTED = 25;

const SUBMITTED_STYLE =
  '{"color":{"border":"#7C9CB9","text":"#173F6F","background":null},"icon":{"color":"#173F6F","name":"pi pi-exclamation-circle"},"image":null}';
const APPROVED_STYLE =
  '{"color":{"border":"#A8CEAB","text":"#7CB580","background":null},"icon":{"color":"#7CB580","name":"pi pi-exclamation-circle"},"image":null}';
const REJECTED_STYLE =
  '{"color":{"border":"#EA8A8A","text":"#CF0808","background":"#FFF3F3"},"icon":{"color":"#CF0808","name":"pi pi-exclamation-circle"},"image":null}';

export class AddBilateralResultStatuses1779190000003
  implements MigrationInterface
{
  name = 'AddBilateralResultStatuses1779190000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`result_status\` (\`result_status_id\`, \`name\`, \`description\`, \`editable_roles\`, \`config\`, \`action_description\`) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
      [
        BILATERAL_PENDING_REVIEW,
        'Bilateral Pending Review',
        'The bilateral result has been submitted and is waiting for review.',
        null,
        SUBMITTED_STYLE,
        'Review this bilateral result.',
        BILATERAL_APPROVED,
        'Bilateral Approved',
        'The bilateral result has passed review and can be pushed to PRMS.',
        null,
        APPROVED_STYLE,
        'Approve this bilateral result.',
        BILATERAL_REJECTED,
        'Bilateral Rejected',
        'The bilateral result was reviewed and did not meet the required criteria.',
        null,
        REJECTED_STYLE,
        'Reject this bilateral result and specify the reason.',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`result_status\` WHERE \`result_status_id\` IN (?, ?, ?)`,
      [BILATERAL_PENDING_REVIEW, BILATERAL_APPROVED, BILATERAL_REJECTED],
    );
  }
}
