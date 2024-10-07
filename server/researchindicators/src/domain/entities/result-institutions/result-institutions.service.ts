import { Injectable } from '@nestjs/common';
import { ResultInstitution } from './entities/result-institution.entity';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Not,
  Repository,
} from 'typeorm';
import { selectManager } from '../../shared/utils/orm.util';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
@Injectable()
export class ResultInstitutionsService {
  private mainRepo: Repository<ResultInstitution>;
  constructor(private dataSource: DataSource) {
    this.mainRepo = dataSource.getRepository(ResultInstitution);
  }

  async create(
    result_id: number,
    institutions: Partial<ResultInstitution> | Partial<ResultInstitution>[],
    institution_role_id: InstitutionRolesEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultInstitution> = selectManager(
      manager,
      ResultInstitution,
      this.mainRepo,
    );

    const institutionsArray = Array.isArray(institutions)
      ? institutions
      : [institutions];

    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        institution_role_id: institution_role_id,
        institution_id: In(
          institutionsArray.map((data) => data.institution_id),
        ),
      },
    });

    const formatDataLever: Partial<ResultInstitution>[] = institutionsArray.map(
      (data) => ({
        result_institution_id: data?.result_institution_id,
        institution_id: data.institution_id,
        institution_role_id: institution_role_id,
      }),
    );

    const updateResultLever = updateArray<ResultInstitution>(
      formatDataLever,
      existData,
      'institution_id',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_institution_id',
    );

    const persistId = filterPersistKey<ResultInstitution>(
      'result_institution_id',
      updateResultLever,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_institution_id: Not(In(persistId)),
      },
      {
        is_active: false,
      },
    );

    const response = (await entityManager.save(updateResultLever)).filter(
      (data) => data.is_active === true,
    );

    return response;
  }

  async updatePartners(
    resultId: number,
    resultInstitution: CreateResultInstitutionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const { institutions } = resultInstitution;
      const resResultInstitution = await this.create(
        resultId,
        institutions,
        InstitutionRolesEnum.PARTNERS,
        manager,
      );

      return resResultInstitution;
    });
  }

  async findInstitutionsByRoleResult(
    resultId: number,
    institution_role_id: InstitutionRolesEnum,
  ) {
    return this.mainRepo.find({
      where: {
        institution_role_id: institution_role_id,
        result_id: resultId,
        is_active: true,
      },
    });
  }

  async findOneInstitutionByRoleResult(
    resultId: number,
    institution_role_id: InstitutionRolesEnum,
  ) {
    return this.mainRepo.findOne({
      where: {
        institution_role_id: institution_role_id,
        result_id: resultId,
        is_active: true,
      },
    });
  }

  async findAll(resultId: number, institution_role_id?: InstitutionRolesEnum) {
    const where: FindOptionsWhere<ResultInstitution> = {};

    if (institution_role_id) {
      where.institution_role_id = institution_role_id;
    }

    return this.mainRepo.find({
      where: {
        ...where,
        result_id: resultId,
        is_active: true,
      },
    });
  }
}
