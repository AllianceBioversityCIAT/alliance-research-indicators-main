import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Canonical official-code text, the same rule `parseCanonicalCode` enforces.
 * Digits only, no leading zero, a positive safe integer.
 * `9007199254740991` is `Number.MAX_SAFE_INTEGER`.
 *
 * The CAST sits inside IF. Under STRICT_TRANS_TABLES, CAST of a non-numeric
 * string errors even when a regexp beside it would reject the row, and AND
 * does not skip the CAST.
 *
 * A NULL `results.platform_code` counts as STAR. Readers treat a missing
 * platform as STAR. Matches on more than one non-STAR platform also stay
 * STAR and keep their reference, so the backfill does not invent a prefix.
 * Every `results` row counts, snapshots and inactive rows included. The
 * design names the result by (external_reference, result_year) and does not
 * filter them.
 */
const CANONICAL_CODE = (column: string): string =>
  `IF(${column} REGEXP '^[1-9][0-9]{0,15}$', CAST(${column} AS UNSIGNED) <= 9007199254740991, 0)`;

/**
 * One row per sync-log id. STAR when STAR (or a result with no platform)
 * is among the matches, when nothing matches, or when the matches do not
 * share a single platform. Otherwise the single non-STAR platform, and
 * `new_reference` is `<platform>-<code>`.
 */
const LOG_PLATFORM_CHOICE = `
  SELECT
    picked.id,
    picked.source_reference,
    picked.result_year,
    picked.platform_code,
    CASE
      WHEN picked.platform_code = 'STAR' THEN picked.source_reference
      ELSE CONCAT(picked.platform_code, '-', picked.source_reference)
    END AS new_reference
  FROM (
    SELECT
      l.id,
      l.external_reference AS source_reference,
      l.result_year,
      CASE
        WHEN SUM(r.result_id IS NOT NULL AND (r.platform_code = 'STAR' OR r.platform_code IS NULL)) > 0 THEN 'STAR'
        WHEN COUNT(r.result_id) = 0 THEN 'STAR'
        WHEN COUNT(DISTINCT r.platform_code) = 1 THEN MIN(r.platform_code)
        ELSE 'STAR'
      END AS platform_code
    FROM \`result_prms_sync_log\` l
    LEFT JOIN \`results\` r
      ON r.report_year_id = l.result_year
     AND r.result_official_code = IF(${CANONICAL_CODE('l.external_reference')}, CAST(l.external_reference AS UNSIGNED), NULL)
    GROUP BY l.id, l.external_reference, l.result_year
  ) picked
`;

/**
 * Two different source references that compute to the same new reference
 * and year. Grouping by the full (platform, reference, year) triple does
 * not raise for that pair: the rewritten row is the non-STAR platform and
 * the row that already stores the prefixed reference stays STAR.
 */
const COLLISION_PRECHECK = `SELECT
    chosen.new_reference,
    chosen.result_year
  FROM (
    ${LOG_PLATFORM_CHOICE}
  ) chosen
  GROUP BY chosen.new_reference, chosen.result_year
  HAVING COUNT(DISTINCT chosen.source_reference) > 1
  LIMIT 1`;

export class AddPlatformCodeToPrmsSyncTables1792673320363
  implements MigrationInterface
{
  name = 'AddPlatformCodeToPrmsSyncTables1792673320363';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read-only. A thrown Error leaves both tables untouched. MySQL commits
    // each ALTER on its own, so this has to run before any DDL.
    const found: unknown = await queryRunner.query(COLLISION_PRECHECK);
    const collisions = Array.isArray(found) ? found : [];
    if (collisions.length > 0) {
      throw new Error('Rewritten sync-log key collides with an existing row');
    }

    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` ADD \`platform_code\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_history\` ADD \`platform_code\` varchar(50) NULL`,
    );

    // Assigning updated_at to itself keeps ON UPDATE CURRENT_TIMESTAMP from
    // rewriting the audit clock. The history backfill and the down restore
    // do the same. updated_at is the only such column, and neither table
    // has a trigger.
    await queryRunner.query(
      `UPDATE \`result_prms_sync_log\` l
      INNER JOIN (
        ${LOG_PLATFORM_CHOICE}
      ) chosen ON chosen.id = l.id
      SET l.platform_code = chosen.platform_code,
          l.external_reference = chosen.new_reference,
          l.updated_at = l.updated_at`,
    );

    await queryRunner.query(
      `UPDATE \`result_prms_sync_history\`
      SET \`platform_code\` = CASE
        WHEN \`correlation_outcome\` = 'CORRELATED' THEN 'STAR'
        WHEN \`event_source\` = 'STAR'
          AND ${CANONICAL_CODE('`result_official_code`')}
        THEN 'STAR'
        ELSE NULL
      END,
          \`updated_at\` = \`updated_at\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` MODIFY \`platform_code\` varchar(50) NOT NULL`,
    );

    await queryRunner.query(
      `DROP INDEX \`idx_result_prms_sync_log_code_year\` ON \`result_prms_sync_log\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_result_prms_sync_history_code_year\` ON \`result_prms_sync_history\``,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_result_prms_sync_log_code_year\` ON \`result_prms_sync_log\` (\`platform_code\`, \`external_reference\`, \`result_year\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_result_prms_sync_history_code_year\` ON \`result_prms_sync_history\` (\`platform_code\`, \`result_official_code\`, \`result_year\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_result_prms_sync_log_code_year\` ON \`result_prms_sync_log\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_result_prms_sync_history_code_year\` ON \`result_prms_sync_history\``,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_result_prms_sync_log_code_year\` ON \`result_prms_sync_log\` (\`external_reference\`, \`result_year\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`idx_result_prms_sync_history_code_year\` ON \`result_prms_sync_history\` (\`result_official_code\`, \`result_year\`)`,
    );
    await queryRunner.query(
      `UPDATE \`result_prms_sync_log\`
      SET \`external_reference\` = SUBSTRING(\`external_reference\`, CHAR_LENGTH(\`platform_code\`) + 2),
          \`updated_at\` = \`updated_at\`
      WHERE \`platform_code\` <> 'STAR'
        AND \`external_reference\` LIKE CONCAT(\`platform_code\`, '-%')`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_log\` DROP COLUMN \`platform_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_prms_sync_history\` DROP COLUMN \`platform_code\``,
    );
  }
}
