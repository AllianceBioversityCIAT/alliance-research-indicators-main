import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultInnovationUse } from './entities/result-innovation-use.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { ResultActor } from '../result-actors/entities/result-actor.entity';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ResultQuantificationsService } from '../result-quantifications/result-quantifications.service';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';

/**
 * T-05 (R-IUA-002, R-IUA-004 AC.5, R-IUA-001, R-IUA-008 AC.1/AC.3/AC.4).
 *
 * Read half only. `create` mirrors `ResultInnovationDevService.create`
 * (`result-innovation-dev.service.ts:217-228`) verbatim in shape. `findOne`
 * mirrors that same file's `findOne` (`:456-528`) assembly pattern: load the
 * detail row, fetch each child collection through its own service with the
 * role argument, return one flat object. `update` (the write transaction) is
 * T-06's — deliberately absent here.
 */
@Injectable()
export class ResultInnovationUseService {
  private readonly mainRepo: Repository<ResultInnovationUse>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _resultActorsService: ResultActorsService,
    private readonly _resultInstitutionTypesService: ResultInstitutionTypesService,
    private readonly _resultQuantificationsService: ResultQuantificationsService,
  ) {
    this.mainRepo = this.dataSource.getRepository(ResultInnovationUse);
  }

  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultInnovationUse> = selectManager(
      manager,
      ResultInnovationUse,
      this.mainRepo,
    );

    return entityManager.save({
      result_id: resultId,
      ...this._currentUser.audit(SetAuditEnum.NEW),
    });
  }

  async findOne(resultId: number) {
    /**
     * DD-9 — the resolved `level` scalar is read off a relation join on the
     * detail row (`innovation_use_level_id → clarisa_innovation_use_levels`),
     * not via `ClarisaInnovationUseLevelsService.findAll(relations, where)`.
     * T-01 established that `ControlListBaseService`'s inherited base drops
     * its `is_active: true` default the instant a caller supplies a `where`,
     * so that path can read a soft-deleted catalog row. The relation join
     * costs nothing extra — the row is already being fetched — and only the
     * scalar `level` is exposed below, never the whole catalog object.
     */
    const detail = await this.mainRepo.findOne({
      where: { result_id: resultId, is_active: true },
      relations: { innovation_use_level: true },
    });

    const [actors, organizations, quantifications] = await Promise.all([
      this._resultActorsService.find(resultId, ActorRolesEnum.INNOVATION_USE),
      this._resultInstitutionTypesService.find(
        resultId,
        InstitutionTypeRoleEnum.INNOVATION_USE,
      ),
      this._resultQuantificationsService.findByResultIdAndRoles(resultId, [
        QuantificationRolesEnum.INNOVATION_USE,
      ]),
    ]);

    return {
      innovation_use_level_id: detail?.innovation_use_level_id ?? null,
      innovation_use_level: detail?.innovation_use_level?.level ?? null,
      innovation_use_level_explanation:
        detail?.innovation_use_level_explanation ?? null,
      actors: (actors ?? []).map((actor) => ({
        ...actor,
        total: this.deriveActorTotal(actor),
      })),
      organizations: organizations ?? [],
      quantifications: quantifications ?? [],
    };
  }

  /**
   * `design.md` §5.5 — read-side only, never stored, recomputed on every
   * read. Three cases:
   *  - aggregate (`sex_age_disaggregation_not_apply === true`) → `actors_count`
   *  - disaggregated with at least one count present → sum, NULL as absent
   *  - disaggregated with all four counts NULL → `null`, NOT `0`. Zero would
   *    claim the user entered a total of nought when they entered nothing.
   *
   * Compared with `=== true`, never truthiness (T-03's lesson): the DTO
   * leaves the mode flag untyped, and a row written before that write-side
   * fix — or by any other path — can still hold a truthy non-boolean. Read
   * classification must match write classification exactly.
   */
  private deriveActorTotal(actor: ResultActor): number | null {
    if (actor?.sex_age_disaggregation_not_apply === true) {
      return actor?.actors_count ?? null;
    }

    const disaggregatedCounts = [
      actor?.women_youth_count,
      actor?.women_not_youth_count,
      actor?.men_youth_count,
      actor?.men_not_youth_count,
    ];

    const allAbsent = disaggregatedCounts.every(
      (count) => count === null || count === undefined,
    );
    if (allAbsent) return null;

    return disaggregatedCounts.reduce(
      (sum: number, count) => sum + (count ?? 0),
      0,
    );
  }
}
