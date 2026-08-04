import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T-09 — seeds the `app_config` rows this feature reads.
 *
 * This is the **fourth** migration in a spec that budgeted two, and like the third
 * it is declared as an overrun rather than absorbed (`tasks.md` §4, RB-4).
 *
 * The rows must exist before the code runs, for two different reasons:
 *
 *  - The sweep's run lock is acquired with a **conditional UPDATE**, which is the
 *    only way to make acquisition atomic across replicas. An `UPDATE` cannot
 *    create a missing row, and `AppConfigService.updateConfig` throws
 *    `NotFoundException` for an absent key — there is no upsert. An in-process
 *    flag would pass a unit test and fail the moment a second instance runs.
 *  - The two behavior flags default safely in code, but seeding them makes the
 *    current posture visible to an operator instead of implicit.
 *
 * Both flags default toward safety and in opposite directions:
 * `hard_delete_enabled = false` (delete nothing) and
 * `protect_inactive_star_links = true` (protect more, pending OQ-7).
 *
 * Note that `app_config` is readable unauthenticated through
 * `GET /api/configuration/:key`, so the lock holder and expiry are public. That is
 * acceptable — neither is a secret — but nothing sensitive may be stored here.
 */
export class SeedDuplicateResolutionConfig1785872085723
  implements MigrationInterface
{
  name = 'SeedDuplicateResolutionConfig1785872085723';

  private static readonly ROWS = [
    {
      key: 'duplicate_resolution.hard_delete_enabled',
      value: 'false',
      description:
        'When false the resolver detects, guards and audits duplicates but deletes nothing. It never falls back to a soft delete, because the soft delete is the defect this spec fixes.',
    },
    {
      key: 'duplicate_resolution.protect_inactive_star_links',
      value: 'true',
      description:
        'When true an inactive link_results row from a STAR result still protects its counterpart from deletion. Pending OQ-7; the conservative default retains.',
    },
    {
      key: 'duplicate_resolution.plan_ttl_minutes',
      value: '30',
      description:
        'How long a reviewed dry-run plan stays valid for apply. Restores the "reviewed recently" property R-RES-008 asks for.',
    },
    {
      key: 'duplicate_resolution.sweep_lock',
      value: '',
      description:
        'Run lock for the duplicate-resolution sweep, as "holderId|expiryEpochMs". Empty means free. Acquired by conditional UPDATE so acquisition is atomic across replicas.',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const row of SeedDuplicateResolutionConfig1785872085723.ROWS) {
      await queryRunner.query(
        `INSERT INTO \`app_config\` (\`key\`, \`simple_value\`, \`description\`, \`category\`, \`subcategory\`)
         VALUES (?, ?, ?, 'Results', 'Duplicate resolution')
         ON DUPLICATE KEY UPDATE \`description\` = VALUES(\`description\`)`,
        [row.key, row.value, row.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = SeedDuplicateResolutionConfig1785872085723.ROWS.map(
      (row) => row.key,
    );
    await queryRunner.query(
      `DELETE FROM \`app_config\` WHERE \`key\` IN (${keys.map(() => '?').join(', ')})`,
      keys,
    );
  }
}
