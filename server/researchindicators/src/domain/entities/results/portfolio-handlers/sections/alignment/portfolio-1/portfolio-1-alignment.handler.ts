import { Injectable } from '@nestjs/common';
import { PortfolioIdEnum } from '../../../enum/portfolio-id.enum';
import { ResultSectionKeyEnum } from '../../../enum/result-section-key.enum';
import { PortfolioHandlerContext } from '../../../core/portfolio-handler-context.interface';
import { ResultAlignmentDto } from '../../../../dto/result-alignment.dto';
import {
  AlignmentSectionHandler,
  AlignmentSectionView,
  LeversSaveReport,
  StrategicObjectivesSaveReport,
} from '../alignment-section-handler.interface';
import { ResultAlignmentOperationsService } from '../shared/result-alignment-operations.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { ClarisaLeversService } from '../../../../../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';

/** Portfolio 1 (2021–2025) — legacy alignment behaviour. */
@Injectable()
export class Portfolio1AlignmentHandler implements AlignmentSectionHandler {
  readonly portfolioId = PortfolioIdEnum.PORTFOLIO_1;
  readonly sectionKey = ResultSectionKeyEnum.ALIGNMENT;

  constructor(
    private readonly alignmentOperations: ResultAlignmentOperationsService,
    private readonly clarisaLeversService: ClarisaLeversService,
    private readonly resultLeversService: ResultLeversService,
  ) {}

  save(
    context: PortfolioHandlerContext,
    payload: ResultAlignmentDto,
  ): Promise<ResultAlignmentDto> {
    return this.alignmentOperations.save(
      context.resultId,
      payload,
      context.manager,
    );
  }

  find(context: PortfolioHandlerContext): Promise<AlignmentSectionView> {
    return this.alignmentOperations.find(context.resultId);
  }

  /**
   * Portfolio 1 owns no strategic objectives (R-RES-004) — this is a
   * property of the portfolio, not something to discover per call, so it
   * reports unsupported without issuing any reference-data query. There is
   * deliberately no `StrategicObjectivesService` dependency on this class.
   */
  async saveStrategicObjectives(
    _resultId: number,
    ids: number[],
  ): Promise<StrategicObjectivesSaveReport> {
    return {
      supported: false,
      saved: [],
      discarded: Array.from(new Set(ids ?? [])),
    };
  }

  /**
   * Narrow levers-only save (design.md DD-1/DD-2/DD-3/DD-5). Validates ids
   * against portfolio 1's own lever set, deduplicates, and writes the
   * survivors as **explicitly primary** levers at `lever_role_id =
   * ALIGNMENT` — never through the section-wide `save` (DD-1), and never
   * with `is_primary` left to the column's `false` default (DD-5, DC-1).
   *
   * Hands `create` only the rows it is about to write — it never reads
   * existing `result_levers` rows and merges them (DD-6). That read-merge
   * step would be dead code today: `formalizeResult` has no update path, so
   * no lever row of any kind can pre-exist for a result reaching this step
   * (R-RES-007).
   */
  async saveLevers(resultId: number, ids: number[]): Promise<LeversSaveReport> {
    const uniqueIds = Array.from(new Set(ids ?? []));

    if (uniqueIds.length === 0) {
      return { saved: [], discarded: [] };
    }

    const validLevers =
      await this.clarisaLeversService.findActiveByIdsForPortfolio(
        uniqueIds,
        this.portfolioId,
      );
    // clarisa_levers.id sits on a `@PrimaryGeneratedColumn({ type: 'bigint' })`
    // column declared `number` on the entity but hydrated as a *string* by
    // TypeORM — normalize both sides before comparing, or every id
    // classifies as discarded despite a perfectly correct query
    // (execution.md T-02 advisory; RK-3).
    const validIds = new Set(validLevers.map((lever) => Number(lever.id)));

    const saved = uniqueIds.filter((id) => validIds.has(Number(id)));
    const discarded = uniqueIds.filter((id) => !validIds.has(Number(id)));

    // BaseServiceSimple.create is a reconciler: calling it with an empty
    // array would deactivate every pre-existing ALIGNMENT-role row for this
    // result (design.md DD-1's rationale, R-RES-005 AC.4). Nothing survived
    // validation, so the call must not happen at all.
    if (saved.length === 0) {
      return { saved: [], discarded };
    }

    await this.resultLeversService.create(
      resultId,
      saved.map((leverId) => ({
        lever_id: leverId as unknown as string,
        is_primary: true,
      })),
      'lever_id',
      LeverRolesEnum.ALIGNMENT,
      undefined,
      ['is_primary'],
    );

    return { saved, discarded };
  }
}
