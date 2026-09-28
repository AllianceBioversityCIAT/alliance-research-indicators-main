import { Injectable } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { AppSecret } from '../../../entities/app-secrets/entities/app-secret.entity';
import { CHUNK } from './sec-user-reconciler.repository';

interface ExternalStatusRow {
  user_status_id: number;
  name: string;
}

interface SystemAdminRoleRow {
  user_id: number;
  role_id: number;
  is_active: boolean;
}

@Injectable()
export class SecUserDeactivationRepository extends Repository<SecUser> {
  constructor(private readonly entityManager: EntityManager) {
    super(SecUser, entityManager);
  }

  /**
   * Selects the external cohort by the id the caller resolved from
   * `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID`.
   *
   * WHY AN ID AND NOT A NAME. This resolution was written as a name lookup for `'external'`
   * (`W-1`), on the grounds that the original literal `4` was unverifiable — `user_status` has no
   * seed, no migration and no enum anywhere in this repository. The reasoning was sound and the
   * chosen value was wrong: the live row is named **`External Accepted`**, so the lookup matched
   * nothing and every run aborted on `C-4` before the measurement could be taken (Dev, 2026-09-25).
   *
   * The id is the stable selector — a rename cannot move it — and the `C-4` abort still fires when
   * the row is absent, so an environment that numbers `user_status` differently refuses to run
   * rather than silently shielding the wrong cohort. This method does not read a module constant:
   * the configured id is the only comparison.
   */
  async resolveExternalStatusId(externalStatusId: number): Promise<{
    statusId: number | null;
    matchCount: number;
  }> {
    const rows: ExternalStatusRow[] = await this.query(
      `SELECT user_status_id, name
        FROM user_status
        WHERE is_active = 1
          AND deleted_at IS NULL`,
      [],
    );
    const matches = rows
      .map((row) => ({
        ...row,
        user_status_id: Number(row.user_status_id),
      }))
      .filter((row) => row.user_status_id === externalStatusId);

    return {
      statusId: matches.length === 1 ? matches[0].user_status_id : null,
      matchCount: matches.length,
    };
  }

  async countActivePopulation(): Promise<number> {
    const rows: { active_population: number }[] = await this.query(
      `SELECT COUNT(*) AS active_population
        FROM sec_users
        WHERE is_active = 1`,
      [],
    );

    return Number(rows[0]?.active_population ?? 0);
  }

  async findActiveSystemAdminUserIds(
    candidateIds: number[],
  ): Promise<number[]> {
    if (!candidateIds?.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(candidateIds));
    this.assertNumericIds(uniqueIds);

    const userIds = new Set<number>();
    for (const idsChunk of this.chunk(uniqueIds, CHUNK)) {
      const placeholders = idsChunk.map(() => '?').join(', ');
      const rows: SystemAdminRoleRow[] = await this.query(
        `SELECT sur.user_id, sur.role_id, sur.is_active
          FROM sec_user_roles sur
          WHERE sur.user_id IN (${placeholders})
            AND sur.role_id = 1
            AND sur.is_active = 1`,
        idsChunk,
      );

      rows
        .map((row) => ({
          user_id: Number(row.user_id),
          role_id: Number(row.role_id),
          is_active: Boolean(row.is_active),
        }))
        .filter((row) => row.role_id === 1 && row.is_active === true)
        .forEach((row) => userIds.add(row.user_id));
    }

    return Array.from(userIds);
  }

  /**
   * One table each. `apply` runs them inside a single transaction, in the order
   * app_secrets → sec_user_roles → sec_users. These methods do not open one.
   *
   * `AND is_active = 1` keeps an already-inactive row out of the write and out of
   * the returned count. The count is the driver's affected-row total, not
   * `userIds.length`.
   *
   * DD-D12: `updated_by` is left NULL. This job has no actor, and a synthetic
   * sec_users id would itself be a deactivation candidate. `updated_at` is not
   * part of the contract — the engine writes it on UPDATE.
   */
  async deactivateAppSecrets(
    manager: EntityManager,
    userIds: number[],
  ): Promise<number> {
    const ids = this.sortedUniqueIds(userIds);
    let affected = 0;
    for (const idsChunk of this.chunk(ids, CHUNK)) {
      const result = await manager.getRepository(AppSecret).update(
        {
          responsible_user_id: In(idsChunk),
          is_active: true,
        },
        { is_active: false },
      );
      affected += Number(result.affected ?? 0);
    }
    return affected;
  }

  async deactivateSecUserRoles(
    manager: EntityManager,
    userIds: number[],
  ): Promise<number> {
    const ids = this.sortedUniqueIds(userIds);
    let affected = 0;
    for (const idsChunk of this.chunk(ids, CHUNK)) {
      const result: { affectedRows?: number } = await manager.query(
        `UPDATE sec_user_roles SET is_active = 0
          WHERE user_id IN (${idsChunk.map(() => '?').join(', ')})
            AND is_active = 1`,
        idsChunk,
      );
      affected += Number(result?.affectedRows ?? 0);
    }
    return affected;
  }

  async deactivateSecUsers(
    manager: EntityManager,
    userIds: number[],
  ): Promise<number> {
    const ids = this.sortedUniqueIds(userIds);
    let affected = 0;
    for (const idsChunk of this.chunk(ids, CHUNK)) {
      const result: { affectedRows?: number } = await manager.query(
        `UPDATE sec_users SET is_active = 0
          WHERE sec_user_id IN (${idsChunk.map(() => '?').join(', ')})
            AND is_active = 1`,
        idsChunk,
      );
      affected += Number(result?.affectedRows ?? 0);
    }
    return affected;
  }

  private assertNumericIds(ids: number[]): void {
    const invalid = ids.filter(
      (id) => typeof id !== 'number' || !Number.isInteger(id) || id <= 0,
    );
    if (invalid.length) {
      throw new Error(
        `SecUserDeactivationRepository: expected positive integer user ids, got: ${invalid.join(', ')}`,
      );
    }
  }

  private sortedUniqueIds(ids: number[]): number[] {
    if (!ids?.length) {
      return [];
    }
    const uniqueIds = Array.from(new Set(ids));
    this.assertNumericIds(uniqueIds);
    return uniqueIds.sort((left, right) => left - right);
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
}
