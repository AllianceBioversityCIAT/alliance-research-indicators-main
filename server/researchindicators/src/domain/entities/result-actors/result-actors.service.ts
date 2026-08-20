import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultActor } from './entities/result-actor.entity';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { InnovationUseActorDto } from '../result-innovation-use/dto/create-result-innovation-use.dto';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { setNull } from '../../shared/utils/object.utils';

@Injectable()
export class ResultActorsService extends BaseServiceSimple<
  ResultActor,
  Repository<ResultActor>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultActor,
      dataSource.getRepository(ResultActor),
      'result_id',
      currentUser,
      'actor_role_id',
    );
  }

  private formatData(actors: CreateResultActorDto[]) {
    return {
      actors: actors.filter(
        (actor) => actor.actor_type_id !== ClarisaActorTypesEnum.OTHER,
      ),
      other: actors.filter(
        (actor) => actor.actor_type_id === ClarisaActorTypesEnum.OTHER,
      ),
    };
  }

  async saveInnovationDev(
    resultId: number,
    data: CreateResultActorDto[],
    manager: EntityManager,
  ) {
    const { other, actors } = this.formatData(data);
    const othersProperties: (keyof ResultActor)[] = [
      'sex_age_disaggregation_not_apply',
      'men_youth',
      'men_not_youth',
      'women_youth',
      'women_not_youth',
    ];
    let notDeleteIds = [];
    if (other.length > 0) {
      const tempData = await this.create(
        resultId,
        other,
        'actor_type_custom_name',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        ['actor_type_id', ...othersProperties],
      );
      notDeleteIds = tempData.map((x) => x.result_actors_id);
    }

    if (actors.length > 0)
      await this.create<ActorRolesEnum>(
        resultId,
        actors,
        'actor_type_id',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        othersProperties,
        undefined,
        notDeleteIds,
      );
  }

  async customSaveInnovationDev(
    resultId: number,
    data: CreateResultActorDto[],
    manager: EntityManager,
  ) {
    const tempRepo = manager.getRepository(ResultActor);
    const dataToSave: Partial<ResultActor>[] = [];
    for (const institution of data) {
      if (institution?.result_actors_id) {
        dataToSave.push({
          is_active: true,
          result_actors_id: institution?.result_actors_id,
          actor_type_id: institution?.actor_type_id,
          men_youth: institution?.men_youth,
          men_not_youth: institution?.men_not_youth,
          women_youth: institution?.women_youth,
          women_not_youth: institution?.women_not_youth,
          actor_type_custom_name:
            institution?.actor_type_id == ClarisaActorTypesEnum.OTHER
              ? setNull(institution?.actor_type_custom_name)
              : null,
          sex_age_disaggregation_not_apply:
            institution?.sex_age_disaggregation_not_apply,
          actor_role_id: ActorRolesEnum.INNOVATION_DEV,
          ...this.currentUser.audit(SetAuditEnum.UPDATE),
        });
      } else {
        const where = this.constructWhereClause(institution, resultId);
        const existData = await tempRepo.findOne({
          where,
        });

        const dataTemp: Partial<ResultActor> = {
          result_id: resultId,
          is_active: true,
          actor_type_id: setNull(institution?.actor_type_id),
          men_youth: setNull(institution?.men_youth),
          men_not_youth: setNull(institution?.men_not_youth),
          women_youth: setNull(institution?.women_youth),
          women_not_youth: setNull(institution?.women_not_youth),
          actor_type_custom_name:
            institution?.actor_type_id == ClarisaActorTypesEnum.OTHER
              ? setNull(institution?.actor_type_custom_name)
              : null,
          sex_age_disaggregation_not_apply: setNull(
            institution?.sex_age_disaggregation_not_apply,
          ),
          actor_role_id: ActorRolesEnum.INNOVATION_DEV,
          ...this.currentUser.audit(SetAuditEnum.NEW),
        };

        if (existData) {
          dataTemp['result_actors_id'] = existData.result_actors_id;
        }

        dataToSave.push(dataTemp);
      }
    }
    await tempRepo.update(
      {
        result_id: resultId,
        is_active: true,
        actor_role_id: ActorRolesEnum.INNOVATION_DEV,
      },
      { is_active: false },
    );
    return tempRepo.save(dataToSave);
  }

  private constructWhereClause(data: CreateResultActorDto, resultId: number) {
    const where: FindOptionsWhere<ResultActor> = {
      result_id: resultId,
      actor_role_id: ActorRolesEnum.INNOVATION_DEV,
    };
    if (data.actor_type_id == ClarisaActorTypesEnum.OTHER) {
      where['actor_type_custom_name'] = data.actor_type_custom_name;
      where['actor_type_id'] = ClarisaActorTypesEnum.OTHER;
    } else {
      where['actor_type_id'] = data?.actor_type_id;
      where['actor_type_custom_name'] = IsNull();
    }

    return where;
  }

  /**
   * T-03 (R-IUA-009 AC.1, AC.4; R-IUA-003 AC.3, AC.6; R-IUA-004 write-side
   * normalisation). Role-swapped sibling of `customSaveInnovationDev` for the
   * five `int` Innovation Use actor counts (`result-actor.entity.ts:76-97`).
   * `actor_role_id: ActorRolesEnum.INNOVATION_USE` MUST appear in the `find`
   * where-clause (`constructWhereClauseInnovationUse`), the saved row, and —
   * above all — the deactivating `update` predicate below: dropping it there
   * would silently deactivate another indicator's Innovation Dev rows
   * (R-IUA-009's highest-severity risk). The four legacy booleans
   * (`men_youth`, `men_not_youth`, `women_youth`, `women_not_youth`) are
   * never written here — Innovation Dev owns them exclusively.
   *
   * **FIXED 2026-08-20 (`docs/specs/innovation-use/details-api/validation-report.md`
   * FAIL-1).** The id-present branch below used to push a save object built
   * directly from `institution.result_actors_id` — a caller-supplied primary
   * key, with no `result_id` in the predicate and no check that the row
   * belongs to this result or this role. `tempRepo.save(...)` then performed
   * a plain PK-keyed UPDATE that could rewrite ANY `result_actors` row the
   * caller named: another result's Innovation Use row (the cross-result
   * variant, formerly quarantined under `it.failing` in
   * `innovation-use-role-isolation.fixture-spec.ts`), or this same result's
   * own Innovation Dev row (the cross-role variant — un-gated until this
   * fix, and the more likely one, since it needs no knowledge of another
   * result). `assertInnovationUseOwnership` now runs first and rejects the
   * whole save with a `400` the moment any submitted `result_actors_id`
   * does not resolve to a row already scoped to `(result_id, actor_role_id
   * = INNOVATION_USE)` — never silently ignoring the id and inserting, never
   * silently overwriting. This method is NOT shared with
   * `customSaveInnovationDev` (that method keeps its own, separate id-present
   * branch above), so `customSaveInnovationDev` is untouched by this fix.
   */
  async customSaveInnovationUse(
    resultId: number,
    data: InnovationUseActorDto[],
    manager: EntityManager,
  ) {
    const tempRepo = manager.getRepository(ResultActor);
    await this.assertInnovationUseOwnership(data, resultId, tempRepo);
    const dataToSave: Partial<ResultActor>[] = [];
    for (const institution of data) {
      // Derived once per row and fed to both the flag write below and
      // `resolveInnovationUseCounts`, on both branches: `innovation_use_validation`
      // reads `sex_age_disaggregation_not_apply` together with `actors_count`/
      // the four disaggregated columns as one unit, so a flag written
      // independently of the counts (e.g. raw, via `setNull(...)`) can persist
      // `TRUE` alongside a populated disaggregated payload — the SQL routine
      // then takes the aggregate branch, finds `actors_count IS NULL`, and
      // returns FALSE permanently. Deriving `isAggregate` once and passing it
      // everywhere makes flag/count disagreement structurally impossible
      // instead of a rule every write site must remember independently. This
      // is why this method diverges from its byte-identical sibling
      // `customSaveInnovationDev:110-111`, which writes the flag raw safely —
      // it never derives per-mode counts from that same flag.
      const isAggregate =
        institution?.sex_age_disaggregation_not_apply === true;
      const counts = this.resolveInnovationUseCounts(institution, isAggregate);
      if (institution?.result_actors_id) {
        dataToSave.push({
          is_active: true,
          result_actors_id: institution?.result_actors_id,
          actor_type_id: institution?.actor_type_id,
          ...counts,
          actor_type_custom_name:
            institution?.actor_type_id == ClarisaActorTypesEnum.OTHER
              ? setNull(institution?.actor_type_custom_name)
              : null,
          sex_age_disaggregation_not_apply: isAggregate,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
          ...this.currentUser.audit(SetAuditEnum.UPDATE),
        });
      } else {
        const where = this.constructWhereClauseInnovationUse(
          institution,
          resultId,
        );
        const existData = await tempRepo.findOne({
          where,
        });

        const dataTemp: Partial<ResultActor> = {
          result_id: resultId,
          is_active: true,
          actor_type_id: setNull(institution?.actor_type_id),
          ...counts,
          actor_type_custom_name:
            institution?.actor_type_id == ClarisaActorTypesEnum.OTHER
              ? setNull(institution?.actor_type_custom_name)
              : null,
          sex_age_disaggregation_not_apply: isAggregate,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
          ...this.currentUser.audit(SetAuditEnum.NEW),
        };

        if (existData) {
          dataTemp['result_actors_id'] = existData.result_actors_id;
        }

        dataToSave.push(dataTemp);
      }
    }
    await tempRepo.update(
      {
        result_id: resultId,
        is_active: true,
        actor_role_id: ActorRolesEnum.INNOVATION_USE,
      },
      { is_active: false },
    );
    return tempRepo.save(dataToSave);
  }

  /**
   * Ownership guard for the Innovation Use save path (FAIL-1 remediation,
   * 2026-08-20 — `docs/specs/innovation-use/details-api/validation-report.md`).
   * Runs BEFORE the id-present branch above builds any save payload, and
   * before the deactivating `update`/`save` below execute, so a rejected
   * payload writes nothing in this method. A caller-supplied
   * `result_actors_id` is honoured only when a row already exists scoped to
   * BOTH the calling `result_id` AND `actor_role_id = INNOVATION_USE` —
   * scoping by either alone is not enough (see the falsification table in
   * this task's report): `result_id` alone would still let a same-result
   * Innovation Dev row be rewritten (the cross-role variant), and role alone
   * would still let a different result's Innovation Use row be rewritten
   * (the cross-result variant). Local to this method only — NOT called from
   * `customSaveInnovationDev`, which keeps its own unmodified id-present
   * branch and is therefore unaffected by this fix.
   */
  private async assertInnovationUseOwnership(
    data: InnovationUseActorDto[],
    resultId: number,
    tempRepo: Repository<ResultActor>,
  ): Promise<void> {
    const idsPresent = data
      .filter((institution) => institution?.result_actors_id)
      .map((institution) => institution.result_actors_id);
    if (idsPresent.length === 0) {
      return;
    }

    const ownedRows = await tempRepo.find({
      where: {
        result_actors_id: In(idsPresent),
        result_id: resultId,
        actor_role_id: ActorRolesEnum.INNOVATION_USE,
      },
    });
    // `result_actors_id` is `@PrimaryGeneratedColumn({ type: 'bigint' })`
    // (see `result-innovation-use.service.ts:210-216` on the same `bigint`
    // hazard: the driver can hydrate it as either a JS `number` or a
    // `string`, depending on `supportBigNumbers`/`bigNumberStrings`). Both
    // sides are normalised to `String(...)` before the membership test so
    // this check does not silently start rejecting every legitimate save the
    // moment that driver configuration changes.
    const ownedIds = new Set(
      ownedRows.map((row) => String(row.result_actors_id)),
    );
    const unauthorized = idsPresent.filter((id) => !ownedIds.has(String(id)));

    if (unauthorized.length > 0) {
      throw new BadRequestException([
        `result_actors_id: unknown or unauthorized actor row — ${unauthorized.join(', ')}`,
      ]);
    }
  }

  /**
   * Mode normalisation (design.md §5.2). `isAggregate` is the caller's
   * `sex_age_disaggregation_not_apply === true` predicate — computed once per
   * row in `customSaveInnovationUse`'s loop body and passed in here, never
   * re-derived, so the persisted flag and the persisted counts cannot
   * disagree. Never compare with truthiness: the DTO leaves the flag untyped
   * (no `@IsBoolean()`), so a non-boolean truthy value (`1`, `"true"`) must
   * still resolve to the disaggregated branch rather than being
   * misclassified as aggregate and nulling counts the client actually sent.
   */
  private resolveInnovationUseCounts(
    institution: InnovationUseActorDto,
    isAggregate: boolean,
  ): Pick<
    ResultActor,
    | 'actors_count'
    | 'women_youth_count'
    | 'women_not_youth_count'
    | 'men_youth_count'
    | 'men_not_youth_count'
  > {
    return isAggregate
      ? {
          actors_count: setNull(institution?.actors_count),
          women_youth_count: null,
          women_not_youth_count: null,
          men_youth_count: null,
          men_not_youth_count: null,
        }
      : {
          actors_count: null,
          women_youth_count: setNull(institution?.women_youth_count),
          women_not_youth_count: setNull(institution?.women_not_youth_count),
          men_youth_count: setNull(institution?.men_youth_count),
          men_not_youth_count: setNull(institution?.men_not_youth_count),
        };
  }

  private constructWhereClauseInnovationUse(
    data: InnovationUseActorDto,
    resultId: number,
  ) {
    const where: FindOptionsWhere<ResultActor> = {
      result_id: resultId,
      actor_role_id: ActorRolesEnum.INNOVATION_USE,
    };
    if (data.actor_type_id == ClarisaActorTypesEnum.OTHER) {
      where['actor_type_custom_name'] = data.actor_type_custom_name;
      where['actor_type_id'] = ClarisaActorTypesEnum.OTHER;
    } else {
      where['actor_type_id'] = data?.actor_type_id;
      where['actor_type_custom_name'] = IsNull();
    }

    return where;
  }
}
