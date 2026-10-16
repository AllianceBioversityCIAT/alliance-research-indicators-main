// @akili-spec changes/profile-simulation
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  ImpersonationUserRow,
  TargetProfile,
} from '../types/impersonation.types';

/**
 * Raw SQL over `sec_users` / `sec_user_roles` / `sec_roles` (ROAR-owned
 * tables — no local TypeORM entity, no FK). First `src` consumer of
 * `sec_roles` (design §2.2, OQ-5).
 *
 * Constructor takes `EntityManager` only — deliberately NOT modeled on
 * `AppSecretRepository`'s constructor (design §2.0): nothing in this module
 * may inject `CurrentUserUtil` (Scope.REQUEST), and `AppConfig` is not
 * needed here.
 *
 * Not a `Repository<T>` subclass: there is no owned entity to pass to
 * `super()` for these external tables, so this stays a plain injectable
 * wrapping `EntityManager.query`.
 */
@Injectable()
export class ImpersonationUserRepository {
  constructor(private readonly entityManager: EntityManager) {}

  /**
   * R-IMP-001: case-insensitive LIKE over email/first_name/last_name,
   * max 20 rows ordered by email. Returns inactive/admin/self rows too —
   * `ImpersonationService.searchUsers` computes `simulable`/`blocked_reason`.
   * Only currently-active role assignments count toward the returned
   * `roles[]` (mirrors what `RolesGuard`-style admin checks consider live).
   */
  async searchUsers(search: string): Promise<ImpersonationUserRow[]> {
    const like = `%${search}%`;
    const query = `
      SELECT
        su.sec_user_id,
        su.first_name,
        su.last_name,
        su.email,
        su.is_active,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT('role_id', sr.sec_role_id, 'name', sr.name)
            )
            FROM sec_user_roles sur
            INNER JOIN sec_roles sr ON sr.sec_role_id = sur.role_id
            WHERE sur.user_id = su.sec_user_id
              AND sur.is_active = true
          ),
          JSON_ARRAY()
        ) AS roles
      FROM sec_users su
      WHERE su.email LIKE ?
         OR su.first_name LIKE ?
         OR su.last_name LIKE ?
      ORDER BY su.email ASC
      LIMIT 20
    `;

    return this.entityManager.query(query, [like, like, like]);
  }

  /**
   * Full target profile (R-IMP-002 `TargetProfileDto`): all role rows
   * (active and inactive — `is_active` travels per entry so the caller can
   * tell which are live) so `RolesService`-equivalent checks on the client
   * have everything they need. Returns the profile even when the user is
   * inactive — `ImpersonationService.start` decides 404 vs proceed.
   */
  async findProfile(userId: number): Promise<TargetProfile | null> {
    const query = `
      SELECT
        su.sec_user_id,
        su.first_name,
        su.last_name,
        su.email,
        su.is_active,
        su.status_id,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'is_active', sur.is_active,
                'user_id', sur.user_id,
                'role_id', sur.role_id,
                'role', JSON_OBJECT(
                  'role_id', sr.sec_role_id,
                  'sec_role_id', sr.sec_role_id,
                  'focus_id', sr.focus_id,
                  'name', sr.name,
                  'is_active', sr.is_active,
                  'justification_update', sr.justification_update
                )
              )
            )
            FROM sec_user_roles sur
            INNER JOIN sec_roles sr ON sr.sec_role_id = sur.role_id
            WHERE sur.user_id = su.sec_user_id
          ),
          JSON_ARRAY()
        ) AS user_role_list
      FROM sec_users su
      WHERE su.sec_user_id = ?
      LIMIT 1
    `;

    return this.entityManager
      .query(query, [userId])
      .then((rows) => rows?.[0] ?? null);
  }
}
