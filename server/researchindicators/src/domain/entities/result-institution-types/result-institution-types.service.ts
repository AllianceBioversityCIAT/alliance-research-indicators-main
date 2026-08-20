import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInstitutionType } from './entities/result-institution-type.entity';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { CreateResultInstitutionTypeDto } from './dto/create-result-institution-type.dto';
import { InnovationUseOrganizationDto } from '../result-innovation-use/dto/create-result-innovation-use.dto';
import { ClarisaInstitutionTypeEnum } from '../../tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import {
  defaultValue,
  isEmpty,
  setNull,
} from '../../shared/utils/object.utils';

/**
 * T-04. Both `customSaveInnovationDev` and `customSaveInnovationUse` reconcile
 * through the same five private helpers below, parameterised by
 * `InstitutionTypeRoleEnum` rather than duplicated — the DTO shapes differ
 * only in `organization_count`, which `InnovationUseOrganizationDto` (T-02)
 * carries and `CreateResultInstitutionTypeDto` does not.
 */
type InstitutionRow =
  | CreateResultInstitutionTypeDto
  | InnovationUseOrganizationDto;

@Injectable()
export class ResultInstitutionTypesService extends BaseServiceSimple<
  ResultInstitutionType,
  Repository<ResultInstitutionType>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultInstitutionType,
      dataSource.getRepository(ResultInstitutionType),
      'result_id',
      currentUser,
      'institution_type_role_id',
    );
  }

  private formatData(
    institutionTypes: CreateResultInstitutionTypeDto[],
  ): SaveInnovationDevInstitutionType {
    return {
      other:
        institutionTypes.filter(
          (institution) =>
            institution.institution_type_id ===
            ClarisaInstitutionTypeEnum.OTHER,
        ) ?? [],
      type:
        institutionTypes.filter(
          (institution) =>
            institution.institution_type_id !==
              ClarisaInstitutionTypeEnum.OTHER &&
            !institution?.sub_institution_type_id,
        ) ?? [],
      sub_type:
        institutionTypes.filter(
          (institution) =>
            institution.institution_type_id !==
              ClarisaInstitutionTypeEnum.OTHER &&
            institution?.sub_institution_type_id,
        ) ?? [],
    };
  }

  async saveInnovationDev(
    resultId: number,
    data: CreateResultInstitutionTypeDto[],
    manager: EntityManager,
  ) {
    const { other, sub_type, type } = this.formatData(data);

    let notDeleteIds = [];
    if (other.length > 0) {
      const tempData = await this.create(
        resultId,
        other,
        'institution_type_custom_name',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        manager,
        ['institution_type_id'],
      );

      notDeleteIds = tempData.map((x) => x.result_institution_type_id);
    }

    if (type.length > 0) {
      const tempData = await this.create(
        resultId,
        type,
        'institution_type_id',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        manager,
        undefined,
        undefined,
        notDeleteIds,
      );

      notDeleteIds = [
        ...notDeleteIds,
        ...tempData.map((x) => x.result_institution_type_id),
      ];
    }

    if (sub_type.length > 0)
      await this.create(
        resultId,
        sub_type,
        'sub_institution_type_id',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        manager,
        ['institution_type_id'],
        undefined,
        notDeleteIds,
      );
  }

  async customSaveInnovationDev(
    resultId: number,
    data: CreateResultInstitutionTypeDto[],
    manager: EntityManager,
  ) {
    const tempRepo = manager.getRepository(ResultInstitutionType);
    const uniqueData = this.removeDuplicates(data);
    const dataToSave: Partial<ResultInstitutionType>[] = [];

    for (const institution of uniqueData) {
      const institutionData = await this.processInstitution(
        institution,
        resultId,
        tempRepo,
        InstitutionTypeRoleEnum.INNOVATION_DEV,
      );
      dataToSave.push(institutionData);
    }

    await this.deactivateExistingRecords(
      resultId,
      tempRepo,
      InstitutionTypeRoleEnum.INNOVATION_DEV,
    );
    return tempRepo.save(dataToSave);
  }

  /**
   * T-04 (R-IUA-007 AC.1, AC.3, AC.4, AC.5; R-IUA-009 AC.2, AC.4). Role-swapped
   * sibling of `customSaveInnovationDev`, sharing the same five private
   * helpers below (parameterised by `role` rather than duplicated —
   * `design.md` §5.3, `tasks.md` T-04 Implementation notes).
   * `institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE` MUST
   * appear in the `find` where-clause (`buildWhereClause` /
   * `constructWhereClause`), the saved row, and — above all — the
   * deactivating `update` predicate in `deactivateExistingRecords`: dropping
   * it there would silently deactivate Innovation Dev's rows on the same
   * result (R-IUA-009's highest-severity risk). `organization_count` exists
   * only on `InnovationUseOrganizationDto` (T-02) — `resolveOrganizationCount`
   * below is the single place that decides whether the column is written at
   * all, so an Innovation Dev row can never carry it.
   *
   * **FIXED 2026-08-20 (`docs/specs/innovation-use/details-api/validation-report.md`
   * FAIL-1).** `buildUpdateData` (reached via `processInstitution`, below)
   * used to build its save object straight from a caller-supplied
   * `result_institution_type_id`, in both its branches, with no `result_id`
   * and no ownership check — a plain PK-keyed UPDATE that could rewrite any
   * `result_institution_types` row the caller named: another result's
   * (cross-result, formerly quarantined under `it.failing` in
   * `innovation-use-role-isolation.fixture-spec.ts`), or this same result's
   * own Innovation Dev organization row (cross-role, un-gated until this
   * fix). `buildUpdateData`/`processInstitution` are **shared** with
   * `customSaveInnovationDev` and are deliberately left untouched — adding
   * the check there would change Dev's behaviour as a side effect, which is
   * out of scope for this fix. Instead, `assertInnovationUseOwnership` below
   * is a NEW method, local to this call path only, that rejects the whole
   * save with a `400` before `processInstitution` runs for any row, the
   * moment a submitted id does not resolve to a row already scoped to BOTH
   * the calling `result_id` AND `institution_type_role_id = INNOVATION_USE`.
   */
  async customSaveInnovationUse(
    resultId: number,
    data: InnovationUseOrganizationDto[],
    manager: EntityManager,
  ) {
    const tempRepo = manager.getRepository(ResultInstitutionType);
    // FAIL-B remediation (2026-08-20, validation-report.md). Guard the RAW
    // payload, not `removeDuplicates`'s output: `removeDuplicates` keys on
    // identity columns only (`institution_type_id`/`sub_institution_type_id`/
    // `institution_id`/custom name) — never on `result_institution_type_id` —
    // and is last-write-wins, so a payload pairing an unauthorized id with a
    // later row sharing the same identity key had the unauthorized row
    // silently dropped before this guard ever saw it (a `200`, not the `400`
    // design.md §15 promises). Validating `data` makes every submitted id
    // visible to the guard, matching design.md's "otherwise the whole save is
    // rejected, never silently ignored" literally rather than nearly.
    await this.assertInnovationUseOwnership(data, resultId, tempRepo);
    const uniqueData = this.removeDuplicates(data);
    const dataToSave: Partial<ResultInstitutionType>[] = [];

    // PK-collision remediation (2026-08-20,
    // `test/fixtures/innovation-use/innovation-use-edit-plus-add-id-collision.fixture-spec.ts`).
    // Every `result_institution_type_id` this RAW payload supplies explicitly
    // (mirrors `assertInnovationUseOwnership`'s own raw-payload read, above —
    // FAIL-B taught this file that reading `uniqueData` here instead would
    // let an id-less row's identity-key collision in `removeDuplicates` hide
    // an explicitly-submitted id from this set too). Consumed by
    // `reconcileAdoptedPrimaryKey`, below, wholly inside this method — never
    // by `buildWhereClause`/`constructWhereClause`, which stay shared with
    // `customSaveInnovationDev` and untouched.
    const idsAlreadyClaimed = new Set(
      data
        .filter((institution) => institution?.result_institution_type_id)
        .map((institution) => String(institution.result_institution_type_id)),
    );

    for (const institution of uniqueData) {
      const institutionData = await this.processInstitution(
        institution,
        resultId,
        tempRepo,
        InstitutionTypeRoleEnum.INNOVATION_USE,
      );
      this.reconcileAdoptedPrimaryKey(
        institution,
        institutionData,
        idsAlreadyClaimed,
      );
      dataToSave.push(institutionData);
    }

    await this.deactivateExistingRecords(
      resultId,
      tempRepo,
      InstitutionTypeRoleEnum.INNOVATION_USE,
    );
    return tempRepo.save(dataToSave);
  }

  /**
   * PK-collision remediation (2026-08-20,
   * `test/fixtures/innovation-use/innovation-use-edit-plus-add-id-collision.fixture-spec.ts`).
   * A Use-only pass over ONE already-built `dataToSave` entry, run
   * immediately after `processInstitution` and before `save()` — wholly
   * inside `customSaveInnovationUse`, never touching the shared
   * `processInstitution`/`buildNewData`/`buildWhereClause`/`constructWhereClause`/
   * `buildUpdateData` (those stay byte-identical to `customSaveInnovationDev`'s
   * call path, per this fix's boundary).
   *
   * The defect: `buildNewData`'s `findOne` (reached only for an id-LESS row,
   * `institution?.result_institution_type_id` falsy below) carries no
   * exclusion of a `result_institution_type_id` another row in this SAME
   * payload already submitted explicitly. An ordinary "edit row X's type,
   * add a new row of X's OLD type" payload has that `findOne` resolve to row
   * X itself — still carrying its OLD identity in the DB, since nothing has
   * been written yet — so the id-less row's `institutionData` comes back
   * carrying X's PK. Left uncorrected, `save()` would issue two PK-keyed
   * UPDATEs against row X instead of an UPDATE plus an INSERT: the added row
   * is never created, and X ends up a column-level hybrid of both payload
   * rows.
   *
   * Detection is exactly `idsAlreadyClaimed.has(...)` on an id-LESS row's
   * adopted PK — a row that submitted its OWN id (the `institution?.result_institution_type_id`
   * guard below) is never touched, since claiming your own PK is not a
   * collision. Resolution turns the adoption back into a plain insert: drop
   * the adopted PK and re-derive the audit stamp as `NEW` — `buildDataTemplate`
   * had stamped it `UPDATE` (`updated_by` only) on the belief the row
   * already existed; once the PK is disowned here, that belief no longer
   * holds, and leaving `updated_by` on a row `save()` is about to INSERT
   * would carry a stale audit column with no `created_by`.
   */
  private reconcileAdoptedPrimaryKey(
    institution: InstitutionRow,
    institutionData: Partial<ResultInstitutionType>,
    idsAlreadyClaimed: Set<string>,
  ): void {
    if (institution?.result_institution_type_id) {
      return;
    }
    const adoptedId = institutionData.result_institution_type_id;
    if (adoptedId === undefined || !idsAlreadyClaimed.has(String(adoptedId))) {
      return;
    }
    delete institutionData.result_institution_type_id;
    delete institutionData.updated_by;
    institutionData.created_by = this.currentUser.audit(
      SetAuditEnum.NEW,
    ).created_by;
  }

  /**
   * Ownership guard for the Innovation Use save path (FAIL-1 remediation,
   * 2026-08-20 — `docs/specs/innovation-use/details-api/validation-report.md`).
   * Runs BEFORE `processInstitution` (and therefore `buildUpdateData`) is
   * called for any row, and before `deactivateExistingRecords`/`save` below
   * execute, so a rejected payload writes nothing in this method. A
   * caller-supplied `result_institution_type_id` is honoured only when a row
   * already exists scoped to BOTH the calling `result_id` AND
   * `institution_type_role_id = INNOVATION_USE` — scoping by either alone is
   * not enough (see the falsification table in this task's report):
   * `result_id` alone would still let a same-result Innovation Dev
   * organization row be rewritten (the cross-role variant), and role alone
   * would still let a different result's Innovation Use organization row be
   * rewritten (the cross-result variant). Deliberately implemented as a
   * standalone method rather than inside `buildUpdateData`/`processInstitution`,
   * which are **shared** with `customSaveInnovationDev` — editing those would
   * change Dev's behaviour as a side effect, out of scope for this fix. Not
   * called from `customSaveInnovationDev`, which is therefore unaffected.
   *
   * **Duplicate-PK remediation, added 2026-08-20 (Reviewer advisory,
   * verified: `[{result_institution_type_id: 77, institution_type_id: 5},
   * {result_institution_type_id: 77, institution_type_id: 6}]`).** This is
   * the organizations mirror of the same-named fix in
   * `ResultActorsService.assertInnovationUseOwnership` — the id-PRESENT
   * counterpart of the id-less PK-collision fix in `customSaveInnovationUse`
   * above, and the same silent-loss, column-hybrid corruption, reached
   * through a third payload shape. Two id-present rows sharing one
   * `result_institution_type_id` both genuinely belong to this result and
   * role, so the ownership check below has nothing to reject on its own —
   * and `idsPresent`'s dedup (added for message cleanliness) meant the id
   * was only ever counted once. `removeDuplicates` in `customSaveInnovationUse`
   * cannot catch it either — it keys on identity columns
   * (`institution_type_id`/etc.), never on `result_institution_type_id`, so
   * `type_5`/`type_6` are distinct keys to it. Checked against the RAW,
   * non-deduplicated `data` this method already receives, before the DB
   * round-trip below: there is no correct merge for "one row asked to
   * become two different things" (unlike the id-less case), so the whole
   * save is rejected with a message distinct from the unauthorized-id one
   * below (design.md §15, mirrors R-IUA-005's duplicate-identity rule).
   */
  private async assertInnovationUseOwnership(
    data: InstitutionRow[],
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
  ): Promise<void> {
    const rawIdsPresent = data
      .filter((institution) => institution?.result_institution_type_id)
      .map((institution) => institution.result_institution_type_id);
    const idsPresent = [...new Set(rawIdsPresent)];
    if (idsPresent.length === 0) {
      return;
    }

    if (rawIdsPresent.length !== idsPresent.length) {
      const seen = new Set<string>();
      const duplicated = new Set<string>();
      for (const id of rawIdsPresent) {
        const key = String(id);
        if (seen.has(key)) {
          duplicated.add(key);
        } else {
          seen.add(key);
        }
      }
      throw new BadRequestException([
        `result_institution_type_id: same id submitted by more than one row — ${[...duplicated].join(', ')}`,
      ]);
    }

    const ownedRows = await tempRepo.find({
      where: {
        result_institution_type_id: In(idsPresent),
        result_id: resultId,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
      },
    });
    // `result_institution_type_id` is `@PrimaryGeneratedColumn({ type: 'bigint' })`
    // (see `result-innovation-use.service.ts`'s `resolveInnovationUseLevel`
    // doc comment on the same `bigint` hazard: the driver can hydrate it as
    // either a JS `number` or a `string`, depending on
    // `supportBigNumbers`/`bigNumberStrings`). Both sides are normalised to
    // `String(...)` before the membership test so this check does not
    // silently start rejecting every legitimate save the moment that driver
    // configuration changes.
    const ownedIds = new Set(
      ownedRows.map((row) => String(row.result_institution_type_id)),
    );
    const unauthorized = idsPresent.filter((id) => !ownedIds.has(String(id)));

    if (unauthorized.length > 0) {
      throw new BadRequestException([
        `result_institution_type_id: unknown or unauthorized organization row — ${unauthorized.join(', ')}`,
      ]);
    }
  }

  private async processInstitution(
    institution: InstitutionRow,
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
    role: InstitutionTypeRoleEnum,
  ): Promise<Partial<ResultInstitutionType>> {
    if (institution?.result_institution_type_id) {
      return this.buildUpdateData(institution, role);
    } else {
      return await this.buildNewData(institution, resultId, tempRepo, role);
    }
  }

  private buildUpdateData(
    institution: InstitutionRow,
    role: InstitutionTypeRoleEnum,
  ): Partial<ResultInstitutionType> {
    if (institution?.is_organization_known) {
      return {
        result_institution_type_id: institution?.result_institution_type_id,
        institution_type_role_id: role,
        is_organization_known: true,
        institution_id: institution?.institution_id,
        is_active: true,
        institution_type_custom_name: null,
        institution_type_id: null,
        sub_institution_type_id: null,
        ...this.resolveOrganizationCount(institution, role),
        ...this.currentUser.audit(SetAuditEnum.UPDATE),
      };
    } else {
      return {
        result_institution_type_id: institution?.result_institution_type_id,
        institution_type_custom_name: defaultValue(
          setNull(institution?.institution_type_custom_name),
          institution?.institution_type_id == ClarisaInstitutionTypeEnum.OTHER,
        ),
        institution_type_id: institution?.institution_type_id,
        institution_type_role_id: role,
        sub_institution_type_id: institution?.sub_institution_type_id,
        is_organization_known: false,
        institution_id: null,
        is_active: true,
        ...this.resolveOrganizationCount(institution, role),
        ...this.currentUser.audit(SetAuditEnum.UPDATE),
      };
    }
  }

  private async buildNewData(
    institution: InstitutionRow,
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
    role: InstitutionTypeRoleEnum,
  ): Promise<Partial<ResultInstitutionType>> {
    const where = this.buildWhereClause(institution, resultId, role);
    const existData = await tempRepo.findOne({ where });

    const dataTemp = this.buildDataTemplate(
      institution,
      resultId,
      existData,
      role,
    );

    if (existData) {
      dataTemp['result_institution_type_id'] =
        existData.result_institution_type_id;
    }

    return dataTemp;
  }

  private buildWhereClause(
    institution: InstitutionRow,
    resultId: number,
    role: InstitutionTypeRoleEnum,
  ) {
    if (institution?.is_organization_known === true) {
      return {
        result_id: resultId,
        institution_id: institution?.institution_id,
        institution_type_role_id: role,
      };
    } else {
      return this.constructWhereClause(institution, resultId, role);
    }
  }

  private buildDataTemplate(
    institution: InstitutionRow,
    resultId: number,
    existData: ResultInstitutionType | null,
    role: InstitutionTypeRoleEnum,
  ): Partial<ResultInstitutionType> {
    if (institution?.is_organization_known) {
      return {
        result_id: resultId,
        institution_type_role_id: role,
        is_organization_known: true,
        institution_id: institution?.institution_id,
        is_active: true,
        ...this.resolveOrganizationCount(institution, role),
        ...this.currentUser.audit(
          defaultValue(
            SetAuditEnum.UPDATE,
            !isEmpty(existData),
            SetAuditEnum.NEW,
          ),
        ),
      };
    } else {
      return {
        result_id: resultId,
        institution_type_custom_name: defaultValue(
          setNull(institution?.institution_type_custom_name),
          institution?.institution_type_id == ClarisaInstitutionTypeEnum.OTHER,
        ),
        institution_type_id: setNull(institution?.institution_type_id),
        institution_type_role_id: role,
        sub_institution_type_id: setNull(institution?.sub_institution_type_id),
        is_organization_known: false,
        institution_id: null,
        is_active: true,
        ...this.resolveOrganizationCount(institution, role),
        ...this.currentUser.audit(
          defaultValue(
            SetAuditEnum.UPDATE,
            !isEmpty(existData),
            SetAuditEnum.NEW,
          ),
        ),
      };
    }
  }

  private async deactivateExistingRecords(
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
    role: InstitutionTypeRoleEnum,
  ) {
    return tempRepo.update(
      {
        result_id: resultId,
        is_active: true,
        institution_type_role_id: role,
      },
      { is_active: false },
    );
  }

  private removeDuplicates(data: InstitutionRow[]): InstitutionRow[] {
    const seen = new Map<string, InstitutionRow>();
    for (const institution of data) {
      let key: string;

      if (
        institution.institution_type_id === ClarisaInstitutionTypeEnum.OTHER
      ) {
        key = `other_${institution.institution_type_id}_${institution.institution_type_custom_name}`;
      } else if (institution.sub_institution_type_id) {
        key = `sub_${institution.sub_institution_type_id}`;
      } else if (institution.institution_type_id) {
        key = `type_${institution.institution_type_id}`;
      } else if (institution.is_organization_known) {
        key = `institution_${institution.institution_id}`;
      }

      seen.set(key, institution);
    }
    return Array.from(seen.values());
  }

  private constructWhereClause(
    data: InstitutionRow,
    resultId: number,
    role: InstitutionTypeRoleEnum,
  ) {
    const where = {
      result_id: resultId,
      institution_type_role_id: role,
    };
    if (data.institution_type_id == ClarisaInstitutionTypeEnum.OTHER) {
      where['institution_type_custom_name'] = data.institution_type_custom_name;
      where['institution_type_id'] = ClarisaInstitutionTypeEnum.OTHER;
      where['sub_institution_type_id'] = IsNull();
    }

    if (data?.sub_institution_type_id) {
      where['sub_institution_type_id'] = data?.sub_institution_type_id;
      where['institution_type_id'] = data?.institution_type_id;
      where['institution_type_custom_name'] = IsNull();
    }

    if (!data?.sub_institution_type_id && data?.institution_type_id) {
      where['institution_type_id'] = data?.institution_type_id;
      where['sub_institution_type_id'] = IsNull();
      where['institution_type_custom_name'] = IsNull();
    }

    return where;
  }

  /**
   * Derives once, per row, whether `organization_count` is written at all.
   * Innovation Dev rows (`role !== INNOVATION_USE`) never gain the key on the
   * returned object — not `undefined`, absent — so `save()` cannot leak the
   * column onto a Dev row regardless of what TypeORM does with `undefined`
   * properties (verified during T-03 at `SubjectChangedColumnsComputer.js:49-51`
   * that TypeORM skips `undefined` and writes `null`; this goes one step
   * further and never sets the property for Dev at all, so that behavior does
   * not need to be relied on here). Consumed by both `buildUpdateData` and
   * `buildDataTemplate` so the value is computed in one place, not two.
   */
  private resolveOrganizationCount(
    institution: InstitutionRow,
    role: InstitutionTypeRoleEnum,
  ): Pick<ResultInstitutionType, 'organization_count'> | Record<string, never> {
    return role === InstitutionTypeRoleEnum.INNOVATION_USE
      ? {
          organization_count: setNull(
            (institution as InnovationUseOrganizationDto)?.organization_count,
          ),
        }
      : {};
  }
}

type SaveInnovationDevInstitutionType = {
  other: CreateResultInstitutionTypeDto[];
  type: CreateResultInstitutionTypeDto[];
  sub_type: CreateResultInstitutionTypeDto[];
};
