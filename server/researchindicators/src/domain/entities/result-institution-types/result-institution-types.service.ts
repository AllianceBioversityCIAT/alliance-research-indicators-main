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

    for (const institution of uniqueData) {
      const institutionData = await this.processInstitution(
        institution,
        resultId,
        tempRepo,
        InstitutionTypeRoleEnum.INNOVATION_USE,
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
   */
  private async assertInnovationUseOwnership(
    data: InstitutionRow[],
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
  ): Promise<void> {
    const idsPresent = [
      ...new Set(
        data
          .filter((institution) => institution?.result_institution_type_id)
          .map((institution) => institution.result_institution_type_id),
      ),
    ];
    if (idsPresent.length === 0) {
      return;
    }

    const ownedRows = await tempRepo.find({
      where: {
        result_institution_type_id: In(idsPresent),
        result_id: resultId,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
      },
    });
    // `result_institution_type_id` is `@PrimaryGeneratedColumn({ type: 'bigint' })`
    // (see `result-innovation-use.service.ts:210-216` on the same `bigint`
    // hazard: the driver can hydrate it as either a JS `number` or a
    // `string`, depending on `supportBigNumbers`/`bigNumberStrings`). Both
    // sides are normalised to `String(...)` before the membership test so
    // this check does not silently start rejecting every legitimate save the
    // moment that driver configuration changes.
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
