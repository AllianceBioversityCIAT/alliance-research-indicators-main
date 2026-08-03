import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ResultPoolFundingTocAlignment } from '../entities/result-pool-funding-toc-alignment.entity';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-05 / R-BIL-092, R-BIL-095
// Persistence for per-SP ToC alignment rows. Write methods accept an
// optional `EntityManager` so T-06 can run them inside the single outer
// `dataSource.transaction` of the alignment write (design §6.3) — same
// `manager.getRepository(...)` pattern the bilateral service already uses.

export interface TocAlignmentUpsertInput {
  result_id: number;
  sp_code: string;
  aligns_with_toc: boolean;
  level?: string | null;
  toc_result_id?: number | null;
  indicator_id?: number | null;
  quantitative_contribution?: number | null;
  toc_result_title?: string | null;
  indicator_description?: string | null;
  unit_messurament?: string | null;
  target_value?: string | null;
  target_year?: number | null;
}

@Injectable()
export class ResultPoolFundingTocAlignmentRepository extends Repository<ResultPoolFundingTocAlignment> {
  constructor(dataSource: DataSource) {
    super(ResultPoolFundingTocAlignment, dataSource.createEntityManager());
  }

  findActiveByResultId(
    resultId: number,
  ): Promise<ResultPoolFundingTocAlignment[]> {
    return this.find({
      where: {
        result_id: resultId,
        is_active: true,
      },
      order: {
        sp_code: 'ASC',
      },
    });
  }

  /**
   * Updates the active row for (result_id, sp_code) in place, or inserts a
   * new one when none exists (design §6.3 step 4 — independent per-SP
   * upsert). Never creates a second active row for the same pair, so the
   * partial-unique index `idx_rpfta_active_result_sp` is never violated.
   */
  async upsertForSp(
    input: TocAlignmentUpsertInput,
    actorUserId: number,
    manager?: EntityManager,
  ): Promise<ResultPoolFundingTocAlignment> {
    const repo = manager
      ? manager.getRepository(ResultPoolFundingTocAlignment)
      : this;

    const tocColumns: Partial<ResultPoolFundingTocAlignment> = {
      aligns_with_toc: input.aligns_with_toc,
      level: input.level ?? null,
      toc_result_id: input.toc_result_id ?? null,
      indicator_id: input.indicator_id ?? null,
      quantitative_contribution: input.quantitative_contribution ?? null,
      toc_result_title: input.toc_result_title ?? null,
      indicator_description: input.indicator_description ?? null,
      unit_messurament: input.unit_messurament ?? null,
      target_value: input.target_value ?? null,
      target_year: input.target_year ?? null,
    };

    const existing = await repo.findOne({
      where: {
        result_id: input.result_id,
        sp_code: input.sp_code,
        is_active: true,
      },
    });

    if (existing) {
      await repo.update(
        { id: existing.id },
        {
          ...tocColumns,
          updated_by: actorUserId,
        },
      );
      return repo.findOne({ where: { id: existing.id } });
    }

    return repo.save(
      repo.create({
        result_id: input.result_id,
        sp_code: input.sp_code,
        ...tocColumns,
        created_by: actorUserId,
        updated_by: actorUserId,
      }),
    );
  }

  /**
   * Soft-deactivates the active rows of `resultId` whose `sp_code` is in
   * `spCodes` (cascade on SP deselection — design §6.3 step 5, R-BIL-093).
   * Returns the number of affected rows.
   */
  async deactivateForSps(
    resultId: number,
    spCodes: string[],
    actorUserId: number,
    manager?: EntityManager,
  ): Promise<number> {
    if (!spCodes.length) {
      return 0;
    }

    const repo = manager
      ? manager.getRepository(ResultPoolFundingTocAlignment)
      : this;

    const result = await repo.update(
      {
        result_id: resultId,
        sp_code: In(spCodes),
        is_active: true,
      },
      {
        is_active: false,
        deleted_at: new Date(),
        updated_by: actorUserId,
      },
    );

    return result.affected ?? 0;
  }
}
