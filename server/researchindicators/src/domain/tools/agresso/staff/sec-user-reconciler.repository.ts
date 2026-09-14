// @akili-spec changes/agresso-staff-sec-users-sync (T-01 — read side)
import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';

/**
 * One `sec_user_roles` row, as returned by the raw reads this repository issues. There is no
 * TypeORM entity for this table (design.md §2.1/§3: "no new TypeORM entities") — this is a plain
 * read shape.
 */
export interface SecUserRoleRow {
  sec_user_role_id: number;
  user_id: number;
  role_id: number;
  is_active: boolean;
}

/**
 * Fixed batch size for every statement this repository chunks — the `sec_user_roles` read here,
 * and the writes T-03 adds. Exported as one module constant (design.md §5.4, OQ-D4) so
 * NFR-AGS-002's fixture can assert an exact statement count (`⌈n / CHUNK⌉`) instead of an
 * inequality that a linear, one-statement-per-row implementation would also satisfy.
 */
export const CHUNK = 50;

/**
 * Read side of the Agresso staff → `sec_users` reconciliation (R-AGS-001, R-AGS-007).
 *
 * Two reads only, both outside any transaction (design.md §2.1, §5.4 N-9): the write side (T-03)
 * re-selects for its assertions from *within* the transaction, and the bulk read here must stay
 * outside it or the re-select in T-04 goes blind to a concurrent insert under InnoDB's default
 * REPEATABLE READ isolation.
 */
@Injectable()
export class SecUserReconcilerRepository extends Repository<SecUser> {
  constructor(private readonly entityManager: EntityManager) {
    super(SecUser, entityManager);
  }

  /**
   * Every `sec_users` row — active **and** inactive.
   *
   * No `is_active` predicate, deliberately (R-AGS-001 AC.1, design.md J-4): scoping this to active
   * rows makes every deactivated account invisible to matching, so a returning employee would be
   * classified `create` instead of `reactivate` — producing a duplicate account rather than
   * restoring the original (R-AGS-007).
   *
   * `sec_users.is_active` is a MySQL `tinyint` (`db/baseline/baseline.sql`). `this.query(...)` is
   * `Repository.query` → `manager.query`, which never runs the row through TypeORM's entity
   * hydration — it is the raw driver result. mysql2's text-protocol parser
   * (`node_modules/mysql2/lib/parsers/text_parser.js`) reads a `TINY` column with
   * `packet.parseLengthCodedIntNoBigCheck()`, which returns the raw integer; nothing coerces it to
   * a JS boolean unless a `typeCast` function is configured, and `orm.config.ts` sets none. Left
   * alone, every row here carries `is_active: 0 | 1` behind this method's declared `boolean` type,
   * which corrupts the strict `=== true`/`=== false` branching in design.md §5.4 for every
   * consumer (T-02, T-06). Coerce once, here, so the type this method declares is the value it
   * returns.
   */
  async findAllSecUsers(): Promise<SecUser[]> {
    const query = `SELECT su.sec_user_id,
        su.first_name,
        su.last_name,
        su.email,
        su.status_id,
        su.carnet,
        su.last_login_at,
        su.is_active,
        su.created_at,
        su.created_by,
        su.updated_at,
        su.updated_by,
        su.deleted_at
      FROM sec_users su`;

    const rows: SecUser[] = await this.query(query, []);
    return rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) }));
  }

  /**
   * `sec_user_roles` rows for the given `sec_users.sec_user_id` values, chunked by `CHUNK`.
   *
   * Chunking is over the **deduplicated set of user ids**, never over rows — a chunk's `IN (…)`
   * matches every role row for each id it contains in one round trip, so all of one user's role
   * rows always land in the same chunk's result. That is what makes `MIN(sec_user_role_id)` (T-06)
   * well-defined against an in-memory result rather than a result that could be split across two
   * statements.
   *
   * Ids are validated as positive integers before any SQL is built (parameterised statements make
   * injection unreachable here, but a malformed id list is a caller bug this repository refuses to
   * paper over by silently producing a wrong or partial `IN` clause).
   *
   * Same raw-tinyint hazard as `findAllSecUsers` above: `sec_user_roles.is_active` is also
   * `tinyint`, this read is also `this.query(...)` (no TypeORM hydration), and mysql2 also returns
   * it as `0 | 1` with no configured `typeCast`. Design.md §5.4's three disjoint reactivate-role
   * branches — "already holds an **active** `role_id = 3` row" vs "entirely inactive" — turn on
   * `=== true` / `=== false` against exactly this field, so it is coerced here too before any
   * caller (T-06) can branch on it.
   */
  async findSecUserRolesByUserIds(
    userIds: number[],
  ): Promise<SecUserRoleRow[]> {
    if (!userIds?.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(userIds));
    this.assertNumericIds(uniqueIds);

    const results: SecUserRoleRow[] = [];
    for (const idsChunk of this.chunk(uniqueIds, CHUNK)) {
      const placeholders = idsChunk.map(() => '?').join(', ');
      const query = `SELECT sur.sec_user_role_id,
          sur.user_id,
          sur.role_id,
          sur.is_active
        FROM sec_user_roles sur
        WHERE sur.user_id IN (${placeholders})`;

      const rows: SecUserRoleRow[] = await this.query(query, idsChunk);
      results.push(
        ...rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) })),
      );
    }

    return results;
  }

  private assertNumericIds(ids: number[]): void {
    const invalid = ids.filter(
      (id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0,
    );
    if (invalid.length) {
      throw new Error(
        `SecUserReconcilerRepository: expected positive integer user ids, got: ${invalid.join(', ')}`,
      );
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
}
