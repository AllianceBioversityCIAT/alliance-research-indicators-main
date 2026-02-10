import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActionDescriptionStatus1768399801819
  implements MigrationInterface
{
  name = 'AddActionDescriptionStatus1768399801819';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status\` ADD \`action_description\` text NULL`,
    );
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ?, action_description = ? WHERE result_status_id = ?`,
      [
        `Approved`,
        `The result has passed all required validations.
It is ready to be displayed in the Results Dashboard, and the reporting process for this result is considered completed.`,
        null,
        `{"color":{"border":"#A8CEAB","text":"#7CB580","background":null},"icon":{"color":"#7CB580","name":"pi pi-exclamation-circle"},"image":null}`,
        'Approve this result without changes.',
        6,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ?, action_description = ? WHERE result_status_id = ?`,
      [
        `Pending Revision`,
        `The result has been reviewed and requires corrections. Feedback should have been provided.
The user must update the information and re-submit it.`,
        `[1, 3, 9]`,
        `{"color":{"border":"#E69F00","text":"#F58220","background":null},"icon":{"color":"#F58220","name":"pi pi-exclamation-circle"},"image":null}`,
        'Provide recommendations and changes.',
        5,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ?, action_description = ? WHERE result_status_id = ?`,
      [
        `Not approved`,
        `The result was reviewed and it seems it does not meet the required quality or validation criteria.
A reason should have been provided.`,
        null,
        `{"color":{"border":"#EA8A8A","text":"#CF0808","background":"#FFF3F3"},"icon":{"color":"#CF0808","name":"pi pi-exclamation-circle"},"image":null}`,
        'Reject this result and specify the reason.',
        7,
      ],
    );

    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ?, action_description = ? WHERE result_status_id = ?`,
      [
        `OICR Not Accepted`,
        `The OICR submission is reviewed and not accepted.
A justification is provided explaining the decision.
`,
        null,
        `{"color":{"border":"#EA8A8A","text":"#CF0808","background":"#FFF3F3"},"icon":{"color":"#CF0808","name":"pi pi-exclamation-circle"},"image":null}`,
        'Reject this result and specify the reason.',
        15,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ?, action_description = ? WHERE result_status_id = ?`,
      [
        `OICR Postponed`,
        `The OICR request has been reviewed and its processing has been deferred.
The SPRM team has decided to postpone it to a future reporting cycle.`,
        null,
        `{"color":{"border":"#E69F00","text":"#F58220","background":"#FFF6ED"},"icon":{"color":"#F58220","name":"pi pi-exclamation-circle"},"image":null}`,
        'Not enough evidence for this reporting year.',
        11,
      ],
    );
    await queryRunner.query(
      `UPDATE result_status SET name = ?, description = ?, editable_roles = ?, config = ?, action_description = ? WHERE result_status_id = ?`,
      [
        `OICR Accepted`,
        `The OICR request is formally accepted.
The OICR is in the development phase with ongoing backstopping from the PISA–SPRM team.`,
        `[1, 9]`,
        `{"color":{"border":"#A8CEAB","text":"#7CB580","background":null},"icon":{"color":"#7CB580","name":"pi pi-exclamation-circle"},"image":null}`,
        'The development of the OICR will continue with backstopping from the PISA-SPRM team.',
        10,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_status\` DROP COLUMN \`action_description\``,
    );
  }
}
