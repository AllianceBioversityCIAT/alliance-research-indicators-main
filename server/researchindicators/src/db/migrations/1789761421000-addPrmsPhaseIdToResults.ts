import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrmsPhaseIdToResults1789761421000
  implements MigrationInterface
{
  name = 'AddPrmsPhaseIdToResults1789761421000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PRMS reporting phase the accepted result was filed under. Read from the
    // ingest response's `version_id`, falling back to `obj_version.id` - PRMS
    // sends the same value in both places. Sits beside `prms_result_code` and is
    // written by the same UPDATE on a successful sync.
    // Nullable with no default on purpose - results synced before this column
    // existed keep NULL, and nothing backfills them (deliberate: test data only,
    // not yet in production).
    await queryRunner.query(
      `ALTER TABLE \`results\` ADD \`prms_phase_id\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results\` DROP COLUMN \`prms_phase_id\``,
    );
  }
}
