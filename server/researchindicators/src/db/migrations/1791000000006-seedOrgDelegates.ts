import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  removeOrgDelegatesSeed,
  seedOrgDelegates,
} from '../seeds/org-structure.seed';

/**
 * Organizational Structure, seeded delegates
 * (docs/specs/institutional-performance/organizational-structure, R-ORG-015,
 * R-ORG-017, design 3.4; requester decision 2026-11-09).
 *
 * Runs after `…005`, which keys `org_unit_delegates` to the version (D-ORG-24)
 * and refuses to run while the table holds rows. That is why the delegates are
 * not seeded by `…004`. Each entry of `SEED_DELEGATES` lands on the seeded
 * `[2026, open)` version of its unit, resolved against THIS database's staff
 * table like a director; unmatched people are logged, not guessed.
 * Idempotent: a re-run inserts 0 rows.
 *
 * `down` removes exactly those rows (the `…005` `down` refuses while any
 * delegate row exists, so this one must run first).
 *
 * Exports ONLY its class (D-ORG-14). No SQL in it holds a question mark or a
 * colon-word.
 *
 * @akili-spec institutional-performance/organizational-structure
 */
export class SeedOrgDelegates1791000000006 implements MigrationInterface {
  name = 'SeedOrgDelegates1791000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await seedOrgDelegates(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removeOrgDelegatesSeed(queryRunner);
  }
}
