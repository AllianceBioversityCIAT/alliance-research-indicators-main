import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
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

  async resolveExternalStatusId(): Promise<{
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
      .filter((row) => row.name.trim().toLowerCase() === 'external');

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

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
}
