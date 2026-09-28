import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { ResultLeverSdgTarget } from '../result-lever-sdg-targets/entities/result-lever-sdg-target.entity';
import { ClarisaSdgTarget } from '../../tools/clarisa/entities/clarisa-sdg-targets/entities/clarisa-sdg-target.entity';
import { Portfolio2026SdgTargetCatalogService } from './portfolio-2026-sdg-target-catalog.service';

@Injectable()
export class ResultSdgTargetsService extends BaseServiceSimple<
  ResultLeverSdgTarget,
  Repository<ResultLeverSdgTarget>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
    private readonly portfolio2026Catalog: Portfolio2026SdgTargetCatalogService,
  ) {
    super(
      ResultLeverSdgTarget,
      dataSource.getRepository(ResultLeverSdgTarget),
      'result_id',
      currentUser,
    );
  }

  /** Portfolio 2026 rows: same table, no lever foreign key. */
  async findByResult(resultId: number): Promise<ResultLeverSdgTarget[]> {
    return this.mainRepo.find({
      where: {
        result_id: resultId,
        result_lever_id: IsNull(),
        is_active: true,
      },
    });
  }

  /**
   * Replaces the result's portfolio-2026 SDG targets (rows with a null lever).
   * Lever-linked rows are left untouched.
   */
  async replaceForResult(
    resultId: number,
    items: { sdg_target_id?: number | string }[] | undefined,
    manager?: EntityManager,
  ): Promise<ResultLeverSdgTarget[]> {
    const ids = [
      ...new Set(
        (items ?? [])
          .map((item) => Number(item?.sdg_target_id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    const clarisaRepo = (manager ?? this.dataSource).getRepository(
      ClarisaSdgTarget,
    );
    const catalog =
      ids.length === 0
        ? []
        : await clarisaRepo.find({ where: { id: In(ids) } });

    const allowedCodes = new Set(await this.portfolio2026Catalog.getCodes());
    const allowedIds = catalog
      .filter((row) => allowedCodes.has(String(row.sdg_target_code)))
      .map((row) => Number(row.id));

    const repo = (manager ?? this.dataSource).getRepository(
      ResultLeverSdgTarget,
    );
    const existing = await repo.find({
      where: { result_id: resultId, result_lever_id: IsNull() },
    });

    if (existing.length > 0) {
      await repo.update(
        {
          result_lever_sdg_target_id: In(
            existing.map((row) => row.result_lever_sdg_target_id),
          ),
        },
        { is_active: false },
      );
    }

    if (allowedIds.length === 0) return [];

    const byTarget = new Map(
      existing.map((row) => [Number(row.sdg_target_id), row]),
    );
    const audit = this.currentUser.audit(SetAuditEnum.BOTH);

    return repo.save(
      allowedIds.map((sdgTargetId) => ({
        result_lever_sdg_target_id:
          byTarget.get(sdgTargetId)?.result_lever_sdg_target_id,
        result_id: resultId,
        result_lever_id: null,
        sdg_target_id: sdgTargetId,
        is_active: true,
        ...audit,
      })),
    );
  }
}
