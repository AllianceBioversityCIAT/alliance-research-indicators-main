import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000
  implements MigrationInterface
{
  name = 'ReplaceResultIdWithOfficialCodeInPrmsSyncLog1790023167000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The log keeps a permanent record of what STAR sent to PRMS. The FK to
    // `results` made that record hostage to the row it described: a result could
    // not be deleted while its sync history existed, and deleting the history to
    // allow it would destroy evidence of a push PRMS had already accepted.
    //
    // The subject is identified by `external_reference` + `result_year`. No new
    // code column is added: `external_reference` ALREADY holds the result official
    // code - measured 2026-09-21, it matched in 37 of 37 populated rows - and the
    // repository now writes it at CLAIM time, so the 17 rows that previously had
    // none (all REFUSED_BY_STAR and UNKNOWN, which never build a payload) are
    // populated from here on. The backfill below fills the historical ones.
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` ADD \`result_year\` year NULL`,
    );

    // Backfill BEFORE dropping anything. Verified against Dev on 2026-09-21: all
    // 54 existing rows join to a live result, so no row loses its identity.
    await queryRunner.query(
      `UPDATE \`result_prms_sync_log\` l
         INNER JOIN \`results\` r ON r.result_id = l.result_id
         SET l.result_year = r.report_year_id,
             l.external_reference = COALESCE(l.external_reference, r.result_official_code)`,
    );

    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` DROP FOREIGN KEY \`FK_result_prms_sync_log_result_id\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_result_prms_sync_log_result\` ON \`result_prms_sync_log\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` DROP COLUMN \`result_id\``,
    );

    // Replaces the dropped index. The pair is how every lookup keys now - the
    // in-flight claim, the attempt counter and the status read.
    await queryRunner.query(
      `CREATE INDEX \`idx_result_prms_sync_log_code_year\` ON \`result_prms_sync_log\` (\`external_reference\`, \`result_year\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rebuilds `result_id` from the code/year pair. NOT exact by construction:
    // a code and year can match several `results` rows - the live one and its
    // snapshots - so this picks the lowest id. Down is a schema rollback, not a
    // faithful restoration of which row each attempt described.
    await queryRunner.query(
      `DROP INDEX \`idx_result_prms_sync_log_code_year\` ON \`result_prms_sync_log\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` ADD \`result_id\` bigint NULL`,
    );
    await queryRunner.query(
      `UPDATE \`result_prms_sync_log\` l
         INNER JOIN (
           SELECT result_official_code, report_year_id, MIN(result_id) AS result_id
           FROM \`results\`
           GROUP BY result_official_code, report_year_id
         ) r
           ON r.result_official_code = l.external_reference
          AND r.report_year_id = l.result_year
         SET l.result_id = r.result_id`,
    );
    await queryRunner.query(
      `DELETE FROM \`result_prms_sync_log\` WHERE \`result_id\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` MODIFY \`result_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_result_prms_sync_log_result\` ON \`result_prms_sync_log\` (\`result_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` ADD CONSTRAINT \`FK_result_prms_sync_log_result_id\` FOREIGN KEY (\`result_id\`) REFERENCES \`results\`(\`result_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` DROP COLUMN \`result_year\``,
    );
  }
}
