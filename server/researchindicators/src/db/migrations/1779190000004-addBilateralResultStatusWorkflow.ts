import { MigrationInterface, QueryRunner } from 'typeorm';

const BILATERAL_WORKFLOW_INDICATOR_IDS = [1, 2, 3, 4, 6] as const;
const DRAFT = 4;
const BILATERAL_PENDING_REVIEW = 23;
const BILATERAL_APPROVED = 24;
const BILATERAL_REJECTED = 25;

const BILATERAL_WORKFLOW_TRANSITIONS = [
  [DRAFT, BILATERAL_PENDING_REVIEW],
  [BILATERAL_PENDING_REVIEW, BILATERAL_APPROVED],
  [BILATERAL_PENDING_REVIEW, BILATERAL_REJECTED],
  [BILATERAL_APPROVED, BILATERAL_PENDING_REVIEW],
  [BILATERAL_REJECTED, BILATERAL_PENDING_REVIEW],
] as const;

export class AddBilateralResultStatusWorkflow1779190000004
  implements MigrationInterface
{
  name = 'AddBilateralResultStatusWorkflow1779190000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = BILATERAL_WORKFLOW_INDICATOR_IDS.flatMap((indicatorId) =>
      BILATERAL_WORKFLOW_TRANSITIONS.map(([fromStatusId, toStatusId]) => [
        indicatorId,
        fromStatusId,
        toStatusId,
        null,
      ]),
    );

    await queryRunner.query(
      `INSERT INTO \`result_status_workflow\` (\`indicator_id\`, \`from_status_id\`, \`to_status_id\`, \`config\`) VALUES ${rows
        .map(() => '(?, ?, ?, ?)')
        .join(', ')}`,
      rows.flat(),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`result_status_workflow\`
       WHERE \`indicator_id\` IN (${BILATERAL_WORKFLOW_INDICATOR_IDS.map(() => '?').join(', ')})
       AND (
         (\`from_status_id\` = ? AND \`to_status_id\` = ?)
         OR (\`from_status_id\` = ? AND \`to_status_id\` = ?)
         OR (\`from_status_id\` = ? AND \`to_status_id\` = ?)
         OR (\`from_status_id\` = ? AND \`to_status_id\` = ?)
         OR (\`from_status_id\` = ? AND \`to_status_id\` = ?)
       )`,
      [
        ...BILATERAL_WORKFLOW_INDICATOR_IDS,
        ...BILATERAL_WORKFLOW_TRANSITIONS.flat(),
      ],
    );
  }
}
