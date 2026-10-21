import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  removeOrgStructureSeed,
  seedOrgStructure,
} from '../seeds/org-structure.seed';

/**
 * Organizational Structure seed (docs/specs/institutional-performance/
 * organizational-structure, R-ORG-015, design 3.4, D-ORG-12, D-ORG-14).
 *
 * Loads the 117 entries of the approved mockup tree (ids 1..117, versions
 * `[2026, open)`, one `seed` log row each, no delegates) and resolves the
 * directors against THIS database's staff table. The data and the idempotent
 * insert functions live in `src/db/seeds/org-structure.seed.ts`; this file
 * exports ONLY its class because `orm.config.ts` treats every exported
 * function in `migrations/**` as a migration (D-ORG-14).
 *
 * `up` first aborts, before writing anything, when an entry that is not part of
 * the seed already sits in `org_units` (an admin created one between `…003`
 * and this migration), and checks 117 / 117 / 117 after the inserts. It is not
 * atomic: the last statement, the `AUTO_INCREMENT` reset, is DDL and commits
 * implicitly; everything before it rolls back together, and a re-run recovers.
 *
 * `down` removes the footprint of ids 1..117 (log rows, ALL versions of those
 * entries including ones added after the seed, and the entries). If an entry
 * was edited after the seed those edits go with it; if anything outside the
 * seeded ids still references a seeded entry, the delete fails on its foreign
 * key and nothing is removed.
 *
 * @akili-spec institutional-performance/organizational-structure
 */
export class SeedOrgStructure1791000000004 implements MigrationInterface {
  name = 'SeedOrgStructure1791000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await seedOrgStructure(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await removeOrgStructureSeed(queryRunner);
  }
}
