import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInstitutionType } from './entities/result-institution-type.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { CreateResultInstitutionTypeDto } from './dto/create-result-institution-type.dto';
import { ClarisaInstitutionTypeEnum } from '../../tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';

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
}

type SaveInnovationDevInstitutionType = {
  other: CreateResultInstitutionTypeDto[];
  type: CreateResultInstitutionTypeDto[];
  sub_type: CreateResultInstitutionTypeDto[];
};
