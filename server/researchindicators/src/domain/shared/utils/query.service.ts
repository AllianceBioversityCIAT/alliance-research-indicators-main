import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';

@Injectable()
export class QueryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Loads the seed row fields required to decide delete scope.
   */
  private async findResultDeleteSeed(resultId: number) {
    return this.dataSource.getRepository(Result).findOne({
      where: { result_id: resultId },
      select: {
        result_id: true,
        result_official_code: true,
        platform_code: true,
        is_snapshot: true,
      },
    });
  }

  /**
   * Resolves every `result_id` in the same logical result family as the seed row.
   *
   * Versioning stores live rows (`is_snapshot = false`) and snapshot rows
   * (`is_snapshot = true`) as separate `results` records that share the same
   * `result_official_code` and `platform_code`.
   */
  async findResultFamilyIds(resultId: number): Promise<number[]> {
    const seed = await this.findResultDeleteSeed(resultId);

    if (!seed) {
      return [];
    }

    const family = await this.dataSource.getRepository(Result).find({
      where: {
        result_official_code: seed.result_official_code,
        platform_code: seed.platform_code,
      },
      select: { result_id: true },
    });

    return family.map((row) => row.result_id);
  }

  /**
   * Resolves which `result_id` values should be deleted for a given seed row.
   *
   * Delete scope rules:
   *  - Live row (`is_snapshot = false`) → delete the full family (live + snapshots).
   *  - Snapshot row (`is_snapshot = true`) → delete only the provided `result_id`.
   */
  async resolveResultDeleteTargetIds(resultId: number): Promise<number[]> {
    const seed = await this.findResultDeleteSeed(resultId);

    if (!seed) {
      return [];
    }

    if (seed.is_snapshot === true) {
      return [seed.result_id];
    }

    return this.findResultFamilyIds(seed.result_id);
  }

  /**
   * Soft-deletes a result via the `delete_result` MySQL function.
   * Scope follows {@link resolveResultDeleteTargetIds}.
   */
  async deleteLogicalResultById(resultId: number): Promise<void> {
    const targetIds = await this.resolveResultDeleteTargetIds(resultId);

    for (const id of targetIds) {
      await this.dataSource.query('SELECT delete_result(?)', [id]);
    }
  }

  /**
   * Hard-deletes a result via the `full_delete_result_version` MySQL function.
   * Scope follows {@link resolveResultDeleteTargetIds}.
   */
  async deleteFullResultById(resultId: number): Promise<void> {
    const targetIds = await this.resolveResultDeleteTargetIds(resultId);

    for (const id of targetIds) {
      await this.dataSource.query('SELECT full_delete_result_version(?)', [id]);
    }
  }
}
