import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInstitutionType } from './entities/result-institution-type.entity';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { CreateResultInstitutionTypeDto } from './dto/create-result-institution-type.dto';
import { ClarisaInstitutionTypeEnum } from '../../tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import {
  defaultValue,
  isEmpty,
  setNull,
} from '../../shared/utils/object.utils';

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
      );
      dataToSave.push(institutionData);
    }

    await this.deactivateExistingRecords(resultId, tempRepo);
    return tempRepo.save(dataToSave);
  }

  private async processInstitution(
    institution: CreateResultInstitutionTypeDto,
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
  ): Promise<Partial<ResultInstitutionType>> {
    if (institution?.result_institution_type_id) {
      return this.buildUpdateData(institution);
    } else {
      return await this.buildNewData(institution, resultId, tempRepo);
    }
  }

  private buildUpdateData(
    institution: CreateResultInstitutionTypeDto,
  ): Partial<ResultInstitutionType> {
    if (institution?.is_organization_known) {
      return {
        result_institution_type_id: institution?.result_institution_type_id,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
        is_organization_known: true,
        institution_id: institution?.institution_id,
        is_active: true,
        institution_type_custom_name: null,
        institution_type_id: null,
        sub_institution_type_id: null,
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
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
        sub_institution_type_id: institution?.sub_institution_type_id,
        is_organization_known: false,
        institution_id: null,
        is_active: true,
        ...this.currentUser.audit(SetAuditEnum.UPDATE),
      };
    }
  }

  private async buildNewData(
    institution: CreateResultInstitutionTypeDto,
    resultId: number,
    tempRepo: Repository<ResultInstitutionType>,
  ): Promise<Partial<ResultInstitutionType>> {
    const where = this.buildWhereClause(institution, resultId);
    const existData = await tempRepo.findOne({ where });

    const dataTemp = this.buildDataTemplate(institution, resultId, existData);

    if (existData) {
      dataTemp['result_institution_type_id'] =
        existData.result_institution_type_id;
    }

    return dataTemp;
  }

  private buildWhereClause(
    institution: CreateResultInstitutionTypeDto,
    resultId: number,
  ) {
    if (institution?.is_organization_known === true) {
      return {
        result_id: resultId,
        institution_id: institution?.institution_id,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
      };
    } else {
      return this.constructWhereClause(institution, resultId);
    }
  }

  private buildDataTemplate(
    institution: CreateResultInstitutionTypeDto,
    resultId: number,
    existData: ResultInstitutionType | null,
  ): Partial<ResultInstitutionType> {
    if (institution?.is_organization_known) {
      return {
        result_id: resultId,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
        is_organization_known: true,
        institution_id: institution?.institution_id,
        is_active: true,
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
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
        sub_institution_type_id: setNull(institution?.sub_institution_type_id),
        is_organization_known: false,
        institution_id: null,
        is_active: true,
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
  ) {
    return tempRepo.update(
      {
        result_id: resultId,
        is_active: true,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
      },
      { is_active: false },
    );
  }

  private removeDuplicates(
    data: CreateResultInstitutionTypeDto[],
  ): CreateResultInstitutionTypeDto[] {
    const seen = new Map<string, CreateResultInstitutionTypeDto>();
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
    data: CreateResultInstitutionTypeDto,
    resultId: number,
  ) {
    const where = {
      result_id: resultId,
      institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
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
}

type SaveInnovationDevInstitutionType = {
  other: CreateResultInstitutionTypeDto[];
  type: CreateResultInstitutionTypeDto[];
  sub_type: CreateResultInstitutionTypeDto[];
};
