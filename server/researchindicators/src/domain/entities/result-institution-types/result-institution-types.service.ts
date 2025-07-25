import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInstitutionType } from './entities/result-institution-type.entity';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import {
  CurrentUserUtil,
  SetAutitEnum,
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
      if (institution?.result_institution_type_id) {
        dataToSave.push({
          result_institution_type_id: institution?.result_institution_type_id,
          institution_type_custom_name: defaultValue(
            setNull(institution?.institution_type_custom_name),
            institution?.institution_type_id ==
              ClarisaInstitutionTypeEnum.OTHER,
          ),
          institution_type_id: institution?.institution_type_id,
          institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
          sub_institution_type_id: institution?.sub_institution_type_id,
          is_active: true,
          ...this.currentUser.audit(SetAutitEnum.UPDATE),
        });
      } else {
        const where = this.constructWhereClause(institution, resultId);
        const existData = await tempRepo.findOne({ where });

        const dataTemp: Partial<ResultInstitutionType> = {
          result_id: resultId,
          institution_type_custom_name: defaultValue(
            setNull(institution?.institution_type_custom_name),
            institution?.institution_type_id ==
              ClarisaInstitutionTypeEnum.OTHER,
          ),
          institution_type_id: setNull(institution?.institution_type_id),
          institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
          sub_institution_type_id: setNull(
            institution?.sub_institution_type_id,
          ),
          is_active: true,
          ...this.currentUser.audit(
            defaultValue(
              SetAutitEnum.UPDATE,
              !isEmpty(existData),
              SetAutitEnum.NEW,
            ),
          ),
        };

        if (existData) {
          dataTemp['result_institution_type_id'] =
            existData.result_institution_type_id;
        }

        dataToSave.push(dataTemp);
      }
    }

    await tempRepo.update(
      {
        result_id: resultId,
        is_active: true,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
      },
      { is_active: false },
    );

    return tempRepo.save(dataToSave);
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
      } else {
        key = `type_${institution.institution_type_id}`;
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
