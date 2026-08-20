import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ClarisaInnovationUseLevel } from '../../tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import {
  CreateResultInnovationUseDto,
  InnovationUseActorDto,
  InnovationUseOrganizationDto,
} from './dto/create-result-innovation-use.dto';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';

/**
 * T-05 (R-IUA-002, R-IUA-004 AC.5, R-IUA-001, R-IUA-008 AC.1/AC.3/AC.4) +
 * T-06 (R-IUA-003, R-IUA-005, R-IUA-006, R-IUA-008 AC.1/AC.2/AC.5,
 * R-IUA-012 AC.2).
 *
 * Read half: `create` mirrors `ResultInnovationDevService.create`
 * (`result-innovation-dev.service.ts:217-228`) verbatim in shape. `findOne`
 * mirrors that same file's `findOne` (`:456-528`) assembly pattern: load the
 * detail row, fetch each child collection through its own service with the
 * role argument, return one flat object.
 *
 * Write half: `update` follows `design.md` §5.1 steps 2–12 exactly.
 * Validation (steps 3–4) runs entirely before `BEGIN` (step 5) — that is
 * what makes "a failure persists nothing" a property of ordering rather
 * than of rollback correctness (DD-3). The existence check (step 2) and its
 * `NotFoundException` happen before the transaction too, mirroring
 * `ResultInnovationDevService.update`'s ordering discipline
 * (`result-innovation-dev.service.ts:234-240`) — never inside `findOne`,
 * which T-06 re-reads through *after* commit (step 12) and which must never
 * throw on a missing row.
 */
@Injectable()
export class ResultInnovationUseService {
  private readonly mainRepo: Repository<ResultInnovationUse>;
  /**
   * `design.md` §9 (Observability), matching
   * `ResultInnovationDevService.logger`
   * (`result-innovation-dev.service.ts:49`) in instantiation shape and call
   * style. FAIL-2 remediation (`validation-report.md`, 2026-08-20): §9
   * carries no requirement id, so this closure enumerates the rejection
   * sites at source rather than from the design prose — see `update()` and
   * its three private validators below. Every `warn` call logs `result_id`
   * and a rule identifier only, **never the payload** (§9's binding
   * constraint) — no DTO, no actor/organization rows, no counts, no custom
   * names, no submitted id beyond what the rule identifier needs.
   *
   * **Scope decision — the two `assertInnovationUseOwnership` rejections in
   * `ResultActorsService`/`ResultInstitutionTypesService` are OUT of scope
   * for this logger,** even though both surface through this class's
   * `update()` via `customSaveInnovationUse` (steps 7–8 below). Reasoning:
   * (1) `assertInnovationUseOwnership` and its call sites are FAIL-1
   * remediation, closed and reviewed 2026-08-20 — this closure's brief
   * explicitly excludes touching them, and the ownership check's own file is
   * off-limits, not just the method; (2) the mirror target,
   * `ResultInnovationDevService`, never wraps a child-service call in
   * try/catch to intercept and re-log an error that originates there — it
   * logs only from rejection points inside its own body. Adding such
   * wrapping here would invent a call-style the reference does not use, to
   * cover two rejections whose owning files this task must not edit; (3)
   * operationally the loss is bounded, just not for the reason once claimed
   * here. **Corrected 2026-08-20 (`design.md` §9):** a thrown
   * `BadRequestException` never reaches `ResponseInterceptor` — that
   * interceptor only runs inside `next.handle().pipe(map(...))` and has no
   * `catchError`. It is `GlobalExceptions` that handles it, and that
   * filter's only log call is `_logger._error(...)`, unconditional on
   * status — so every thrown `400` in this codebase lands at `ERROR`, not
   * `warn`, platform-wide. Signal is not lost, only mis-levelled: the
   * rule-name/service-scope detail this closure's own `warn` calls add is
   * still the only thing these two rejections would otherwise be missing.
   */
  private readonly logger = new CgiarLogger(ResultInnovationUseService.name);
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _resultActorsService: ResultActorsService,
    private readonly _resultInstitutionTypesService: ResultInstitutionTypesService,
    private readonly _resultQuantificationsService: ResultQuantificationsService,
    private readonly _updateDataUtil: UpdateDataUtil,
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

  /**
   * `design.md` §5.1 — the write transaction, steps 2–12.
   *
   * Steps 2 (existence check), 3 (level resolution) and 4 (cross-field
   * validation) run before step 5 (`BEGIN`). Any failure in 2–4 throws
   * before a single write happens — no child service is called, nothing is
   * persisted. Steps 6–10 run inside `dataSource.transaction`, each child
   * call threaded with the transaction's `manager` (DD-10, so
   * `upsertByCompositeKeys`'s writes cannot land outside the transaction the
   * way OICR's do). Step 12's re-read happens *after* the transaction
   * promise resolves (i.e. after `COMMIT`), through `findOne` — never inside
   * the callback, and never the request body (R-IUA-003 AC.4).
   *
   * **DD-14 (user ruling, 2026-08-19, T-06 attempt 1 review, Lens C).** Step
   * 3's level and step 4a's explanation are each resolved against the
   * *effective post-write row* — the payload's value when the key is
   * present (even an explicit `null`), the stored row's value otherwise —
   * before the level ≥ 6 justification rule runs. Validating the payload
   * alone let `PATCH {"innovation_use_level_explanation": null}` against a
   * stored level 6 slip past the rule while step 6's partial-merge write
   * (TypeORM skips `undefined` properties) left `level_id = 7` in place:
   * level 6, no justification, `200`. DD-14 does not change step 6 itself —
   * "an omitted key preserves a scalar" still holds for what gets
   * *persisted*; it only changes what the *validator* sees.
   */
  async update(
    resultId: number,
    createResultInnovationUseDto: CreateResultInnovationUseDto,
  ) {
    // Step 2 — 404 before anything else.
    const existingResult = await this.mainRepo.findOne({
      where: { result_id: resultId, is_active: true },
    });

    if (!existingResult) {
      this.logger.warn(
        `Innovation use save rejected for result ${resultId}: no detail row found`,
      );
      throw new NotFoundException(`Result with ID ${resultId} not found`);
    }

    // Step 3 — resolve the *effective* level id and explanation (DD-14):
    // `!== undefined`, never `??`. An omitted key (`undefined`) preserves
    // the stored value; an explicit `null` (or, for the explanation, `''`)
    // must reach the validator as the clearing it actually is. `??` cannot
    // tell those two apart — it would let an explicit `null` fall through
    // to the stored value exactly like an omitted key, reopening the
    // bypass DD-14 exists to close.
    const effectiveLevelId =
      createResultInnovationUseDto?.innovation_use_level_id !== undefined
        ? createResultInnovationUseDto.innovation_use_level_id
        : existingResult.innovation_use_level_id;
    const effectiveExplanation =
      createResultInnovationUseDto?.innovation_use_level_explanation !==
      undefined
        ? createResultInnovationUseDto.innovation_use_level_explanation
        : existingResult.innovation_use_level_explanation;

    // Step 3 (cont'd) — resolve the catalog's `level` scalar (trap 2),
    // against the effective level id, not the raw payload.
    const level = await this.resolveInnovationUseLevel(
      effectiveLevelId,
      resultId,
    );

    // Step 4 — a) level rule against the effective row, then b)
    // duplicate-actor rule over the incoming payload. Any throw here
    // happens before `BEGIN`; no child service below has been invoked yet.
    this.validateLevelExplanation(level, effectiveExplanation, resultId);
    this.validateNoDuplicateActorTypes(
      createResultInnovationUseDto?.actors ?? [],
      resultId,
    );
    // Step 4 (cont'd) — c) every organization row must identify its
    // organization (R-IUA-007 AC.6, `validation-report.md` FAIL-1). Before
    // `BEGIN`, for the reasons in the method's own doc comment.
    this.validateOrganizationsAreIdentified(
      createResultInnovationUseDto?.organizations ?? [],
      resultId,
    );

    await this.dataSource.transaction(async (manager) => {
      // Step 6 — "omitted = preserve" still governs the *write*: TypeORM's
      // `UpdateQueryBuilder` skips `undefined` properties outright, so an
      // omitted key here leaves the stored column untouched. DD-14 only
      // changed what step 4's validator sees, not this statement.
      await manager.getRepository(this.mainRepo.target).update(resultId, {
        innovation_use_level_id:
          createResultInnovationUseDto?.innovation_use_level_id,
        innovation_use_level_explanation:
          createResultInnovationUseDto?.innovation_use_level_explanation,
        ...this._currentUser.audit(SetAuditEnum.UPDATE),
      });

      // Step 7.
      await this._resultActorsService.customSaveInnovationUse(
        resultId,
        createResultInnovationUseDto?.actors ?? [],
        manager,
      );

      // Step 8.
      await this._resultInstitutionTypesService.customSaveInnovationUse(
        resultId,
        createResultInnovationUseDto?.organizations ?? [],
        manager,
      );

      // Step 9 — `manager` is positional argument five (DD-10).
      await this._resultQuantificationsService.upsertByCompositeKeys(
        resultId,
        createResultInnovationUseDto?.quantifications ?? [],
        ['quantification_number', 'unit', 'description'],
        QuantificationRolesEnum.INNOVATION_USE,
        manager,
      );

      // Step 10.
      await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);
      // Step 11 (`COMMIT`) happens implicitly once this callback resolves.
    });

    // Step 12 — post-commit re-read, through the same assembly the GET uses.
    return this.findOne(resultId);
  }

  /**
   * `design.md` §5.1 step 3 (R-IUA-006 AC.6, trap 2). Resolves the catalog's
   * `level` scalar by looking the row up on its own primary key — never
   * through `ClarisaInnovationUseLevelsService.findAll(relations, where)`,
   * whose inherited base drops its `is_active: true` default the instant a
   * caller supplies a `where` (T-01), and never by `name` (catalog names
   * repeat in pairs across adjacent levels — R-IUA-010 AC.6). No level id
   * supplied → `undefined`, so the explanation rule never fires
   * (R-IUA-006 AC.5, draft-save).
   *
   * **No `is_active` filter here, deliberately (fold-in, T-06 attempt 2).**
   * A stored FK's level is a fact about the row, not about catalog
   * currency, and `findOne`'s relation join applies no such filter either
   * — filtering only here would let a soft-deleted level ≥ 6 row silently
   * skip the justification rule (fail-open) while the GET still reports
   * that level, two halves disagreeing about the same row.
   *
   * **A level id that resolves to no catalog row at all is a client error,
   * not an FK constraint's problem.** Rejecting it here, before `BEGIN`,
   * returns a `400` naming the field; left to the FK constraint it would
   * surface as a `500` carrying TypeORM's raw SQL and constraint name,
   * because `GlobalExceptions` has no `QueryFailedError` branch.
   *
   * `level` is a `bigint` column, which the MySQL driver returns as a
   * `string` at runtime. `Number(...)` keeps the resolved scalar a real
   * `number` so a later refactor of the threshold check (e.g. to `===` or
   * `Number.isInteger`) cannot silently break against real rows while
   * every mocked test — which supplies `level` as a JS number literal —
   * stays green.
   */
  private async resolveInnovationUseLevel(
    levelId?: number,
    resultId?: number,
  ): Promise<number | undefined> {
    if (levelId === null || levelId === undefined) {
      return undefined;
    }

    const row = await this.dataSource
      .getRepository(ClarisaInnovationUseLevel)
      .findOne({ where: { id: levelId } });

    if (!row) {
      // §9 — result_id and the rule that fired, never the payload (the
      // submitted level id is not logged: it is not needed to identify the
      // rule, and it is exactly the kind of submitted-id-beyond-the-rule
      // the closure brief rules out).
      this.logger.warn(
        `Innovation use save rejected for result ${resultId}: innovation_use_level_id resolves to no catalog row`,
      );
      throw new BadRequestException([
        'innovation_use_level_id: unknown innovation use level',
      ]);
    }

    return Number(row.level);
  }

  /**
   * R-IUA-006 — compares the resolved `level` scalar (`level`, already
   * joined through the catalog by `resolveInnovationUseLevel`), never the FK
   * `innovation_use_level_id`. `clarisa_innovation_use_levels.id = level + 1`
   * — a rule written against the FK demands the justification a full level
   * early and passes a naive test on the discriminating pair (catalog
   * `id 6` / `level 5` vs. `id 7` / `level 6`).
   */
  private validateLevelExplanation(
    level: number | undefined,
    explanation: string | undefined,
    resultId: number,
  ): void {
    if (level === undefined || level === null || level < 6) {
      return;
    }

    if (!explanation || explanation.trim().length === 0) {
      // §9 — result_id and the rule (R-IUA-006), never the explanation text
      // itself or the resolved level.
      this.logger.warn(
        `Innovation use save rejected for result ${resultId}: level >= 6 justification missing (R-IUA-006)`,
      );
      throw new BadRequestException([
        'innovation_use_level_explanation: required when the innovation use level is 6 or above',
      ]);
    }
  }

  /**
   * R-IUA-005 — identity is `actor_type_id`, except for `OTHER`
   * (`ClarisaActorTypesEnum.OTHER`), where identity is
   * `(OTHER, actor_type_custom_name)`. Two `OTHER` rows with different
   * custom names are distinct, never a duplicate (AC.2); two rows sharing a
   * non-OTHER `actor_type_id`, or two `OTHER` rows sharing the same custom
   * name, are rejected (AC.1, AC.3). Runs over the incoming payload only —
   * a previously-saved row of type X re-sent once is never a duplicate of
   * itself (AC.5).
   */
  private validateNoDuplicateActorTypes(
    actors: InnovationUseActorDto[],
    resultId: number,
  ): void {
    const seenIdentities = new Set<string>();

    for (const actor of actors) {
      const identity =
        actor?.actor_type_id === ClarisaActorTypesEnum.OTHER
          ? `OTHER:${actor?.actor_type_custom_name}`
          : `TYPE:${actor?.actor_type_id}`;

      if (seenIdentities.has(identity)) {
        // §9 — result_id and the rule (R-IUA-005), never the payload: no
        // actor_type_id, no custom name, even though the thrown exception
        // (a client-facing 400, not a log) does carry the id.
        this.logger.warn(
          `Innovation use save rejected for result ${resultId}: duplicate actor identity in payload (R-IUA-005)`,
        );
        throw new BadRequestException([
          `actor_type_id: duplicate actor type in payload — ${actor?.actor_type_id}`,
        ]);
      }
      seenIdentities.add(identity);
    }
  }

  /**
   * **R-IUA-007 AC.6 — the organization counterpart of R-IUA-004 AC.6.**
   * Added 2026-08-20 (`validation-report.md` **FAIL-1**, user ruling: close it
   * on the Use path only, without touching the helpers shared with
   * `customSaveInnovationDev`).
   *
   * **The defect this closes.** An organization row carrying no identity
   * field at all — `{"organizations":[{"organization_count":12}]}`, or
   * literally `{}` — passed every gate and reached
   * `ResultInstitutionTypesService.constructWhereClause`, where **all three**
   * of its `if` branches are false, so the emitted predicate degenerates to
   * `{ result_id, institution_type_role_id }`. `findOne` then returns an
   * **arbitrary** existing Innovation Use organization row of this result,
   * `buildNewData` adopts its primary key, and `buildDataTemplate`'s
   * else-branch overwrites it with `institution_type_id: null`,
   * `sub_institution_type_id: null`, `institution_type_custom_name: null`,
   * `institution_id: null`, `organization_count: null` — while
   * `deactivateExistingRecords` deactivates every *other* row in the
   * section. A `200`, and the victim's values are unrecoverable.
   *
   * **Why none of the three existing protections caught it.** All three are
   * keyed on a *submitted* id: `assertInnovationUseOwnership` returns early
   * when the payload names none; `reconcileAdoptedPrimaryKey` returns early
   * because its claimed-id set is empty (it exists for payload-internal
   * collisions, not for a PK adopted by an unscoped lookup); and
   * `removeDuplicates` sees a single row. This payload submits no id, so it
   * walks past all three.
   *
   * **Why this lives here and not on the DTO**, which is where the ruling's
   * wording put it. A class-validator rule on `InnovationUseOrganizationDto`
   * only runs where a `ValidationPipe` runs, and **DD-8** records that this
   * repo has no global pipe — it is applied per handler. The rule would then
   * be inert for any future caller of `update()` that skips the pipe (DC-10,
   * the failure mode `requirements.md` §5.2 enumerates), and — decisively —
   * the fixture tier calls this service directly, so a DTO-only rule **could
   * not be proven against real MySQL at the tier where the defect was
   * found**. Placed here it runs for every caller, and — like R-IUA-005 above
   * and unlike `assertInnovationUseOwnership` — it runs **before `BEGIN`**, so
   * R-IUA-003 AC.2 holds for it by *ordering* rather than by rollback
   * (**DD-3**, whose one recorded exception this therefore does not widen).
   *
   * **The identity rule mirrors what the lookup actually keys on.** A known
   * organization is identified by `institution_id` — and `buildWhereClause`
   * takes that branch only on `is_organization_known === true`, so the flag is
   * part of the identity, not decoration. Anything else is identified by
   * `institution_type_id`, with `sub_institution_type_id` and the `OTHER`
   * custom name as refinements of it, never substitutes: a sub-type without
   * its parent would leave `constructWhereClause`'s second branch emitting
   * `institution_type_id: undefined`.
   *
   * **Not closed here:** the same hole in `customSaveInnovationDev`, which
   * shares `constructWhereClause` and whose own DTO is equally permissive.
   * The exposure is asymmetric exactly as `assertInnovationUseOwnership`'s
   * is — recorded in `../family.md` **FR-7**, not fixed by this method.
   */
  private validateOrganizationsAreIdentified(
    organizations: InnovationUseOrganizationDto[],
    resultId: number,
  ): void {
    for (const [index, organization] of organizations.entries()) {
      const identified =
        organization?.is_organization_known === true
          ? organization?.institution_id !== undefined &&
            organization?.institution_id !== null
          : organization?.institution_type_id !== undefined &&
            organization?.institution_type_id !== null;

      if (!identified) {
        // §9 — result_id, the rule and the offending row index; never the
        // payload values.
        this.logger.warn(
          `Innovation use save rejected for result ${resultId}: organization row ${index} carries no identity field (R-IUA-007 AC.6)`,
        );
        throw new BadRequestException([
          `organizations.${index}.institution_type_id: an organization row must identify its organization — supply institution_type_id, or is_organization_known together with institution_id`,
        ]);
      }
    }
  }

  async findOne(resultId: number) {
    /**
     * DD-9 — the resolved `level` scalar is read off a relation join on the
     * detail row (`innovation_use_level_id → clarisa_innovation_use_levels`),
     * not via `ClarisaInnovationUseLevelsService.findAll(relations, where)`,
     * whose inherited base drops its `is_active: true` default the instant a
     * caller supplies a `where` (T-01) — that is the hazard the relation
     * join avoids. **It does not avoid reading a soft-deleted catalog row**
     * (corrected, T-06 attempt 2 — the original wording overstated this): a
     * relation join applies no `is_active` filter of its own and returns
     * whatever row the FK points at, active or not, exactly like the
     * write-side lookup in `resolveInnovationUseLevel` — a stored FK's
     * level is a fact about the row, not about catalog currency. The
     * relation join costs nothing extra — the row is already being fetched
     * — and only the scalar `level` is exposed below, never the whole
     * catalog object.
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
