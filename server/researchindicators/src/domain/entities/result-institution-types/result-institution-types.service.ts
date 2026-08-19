import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInstitutionType } from './entities/result-institution-type.entity';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
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
   */
  async customSaveInnovationUse(
    resultId: number,
    data: InnovationUseOrganizationDto[],
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
