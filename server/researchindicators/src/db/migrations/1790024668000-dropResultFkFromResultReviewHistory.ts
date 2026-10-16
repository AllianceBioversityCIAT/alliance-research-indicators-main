import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropResultFkFromResultReviewHistory1790024668000
  implements MigrationInterface
{
  name = 'DropResultFkFromResultReviewHistory1790024668000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `result_review_history` is an append-only audit trail: `bilateral.service`
    // writes a POOL_FUNDING_ALIGNMENT_CHANGED row inside the Pool Funding save
    // transaction, and nothing in the codebase reads it back. Its FK to `results`
    // was ON DELETE NO ACTION, so it blocked deleting a result - and deleting the
    // history to allow that would destroy the record of what changed and when.
    //
    // Only the CONSTRAINT goes. `result_id` stays as a plain column, and so does
    // `idx_result_review_history_result_created`, so existing rows keep pointing
    // at their result and the lookup stays indexed. A row whose result is later
    // deleted becomes an orphaned but readable record, which is what an audit
    // trail should be.
    await queryRunner.query(
      `ALTER TABLE \`result_review_history\` DROP FOREIGN KEY \`fk_rrh_result\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restoring the constraint will FAIL if any row has been orphaned in the
    // meantime - which is exactly what dropping it allows. Clean those first if
    // this rollback is ever needed; deleting them silently here would throw away
    // audit rows to satisfy a schema rollback.
    await queryRunner.query(
      `ALTER TABLE \`result_review_history\` ADD CONSTRAINT \`fk_rrh_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
