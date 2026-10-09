import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills `prms_result_code` onto the live version of STAR results that were
 * pushed to PRMS before the push started writing the code there too.
 *
 * A live row is filled only when it is STAR, active, has no code yet, and its
 * active STAR versions agree on exactly one code. A result whose versions carry
 * different codes is left untouched rather than guessed. The phase is never
 * copied: it belongs to the version that was pushed, not to the live row.
 */
export class BackfillPrmsResultCodeOnLiveVersions1791316921000
  implements MigrationInterface
{
  name = 'BackfillPrmsResultCodeOnLiveVersions1791316921000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE results live
      INNER JOIN (
        SELECT v.result_official_code,
               MIN(v.prms_result_code) AS prms_result_code
        FROM results v
        WHERE v.is_snapshot = TRUE
          AND v.is_active = TRUE
          AND v.platform_code = 'STAR'
          AND v.prms_result_code IS NOT NULL
        GROUP BY v.result_official_code
        HAVING COUNT(DISTINCT v.prms_result_code) = 1
      ) src ON src.result_official_code = live.result_official_code
      SET live.prms_result_code = src.prms_result_code
      WHERE live.is_snapshot = FALSE
        AND live.is_active = TRUE
        AND live.platform_code = 'STAR'
        AND live.prms_result_code IS NULL
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty. Once this has run, the push also writes the code onto
    // the live version, and the two writes are indistinguishable, so a revert
    // would erase codes this migration never set.
  }
}
