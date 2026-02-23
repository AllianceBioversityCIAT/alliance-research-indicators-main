import { Injectable } from '@nestjs/common';
import { ResultInstitution } from './entities/result-institution.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { isEmpty } from '../../shared/utils/object.utils';
import { SessionFormatEnum } from '../session-formats/enums/session-format.enum';
import { Result } from '../results/entities/result.entity';
import { AiRawInstitution } from '../results/dto/result-ai.dto';
import { ResultInstitutionAi } from './entities/result-institution-ai.entity';
import { selectManager } from '../../shared/utils/orm.util';
@Injectable()
export class ResultInstitutionsService extends BaseServiceSimple<
  ResultInstitution,
  Repository<ResultInstitution>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
    private readonly _updateDataUtil: UpdateDataUtil,
  ) {
    super(
      ResultInstitution,
      dataSource.getRepository(ResultInstitution),
      'result_id',
      currentUser,
      'institution_role_id',
    );
  }

  filterInstitutionsAi(
    institutios: AiRawInstitution[],
    institution_role: InstitutionRolesEnum,
  ): {
    acept: Partial<ResultInstitution>[];
    pending: Partial<ResultInstitutionAi>[];
  } {
    if (isEmpty(institutios)) return { acept: [], pending: [] };
    const aceptInstitutions: Partial<ResultInstitution>[] = [];
    const pendingInstitutions: Partial<ResultInstitutionAi>[] = [];
    for (const institution of institutios) {
      if (
        parseInt(institution.similarity_score) >= 70 &&
        institution?.institution_id
      )
        aceptInstitutions.push({
          institution_id: parseInt(institution.institution_id),
        });
      else
        pendingInstitutions.push({
          institution_id: institution?.institution_id
            ? parseInt(institution.institution_id)
            : null,
          institution_role_id: institution_role,
          institution_name: institution.institution_name,
          score: parseInt(institution.similarity_score),
        });
    }

    return {
      acept: !isEmpty(aceptInstitutions) ? aceptInstitutions : [],
      pending: !isEmpty(pendingInstitutions) ? pendingInstitutions : [],
    };
  }

  async insertInstitutionsAi(
    resultId: number,
    institutions: ResultInstitutionAi[],
    institution_role: InstitutionRolesEnum,
    manager?: EntityManager,
  ) {
    if (isEmpty(institutions)) return null;
    const useManager = selectManager<ResultInstitutionAi>(
      manager,
      ResultInstitutionAi,
      this.dataSource.getRepository(ResultInstitutionAi),
    );
    return useManager.save(
      institutions
        .map((institution) => ({
          result_id: resultId,
          institution_id: institution.institution_id,
          institution_role_id: institution_role,
          institution_name: institution.institution_name,
          score: institution.score,
        }))
        .filter((el) => !isEmpty(el?.institution_id)),
    );
  }

  async updatePartners(
    resultId: number,
    resultInstitution: CreateResultInstitutionDto,
    isAi: boolean = false,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const tempIsPartnerNotApplicable = isEmpty(
        resultInstitution?.is_partner_not_applicable,
      )
        ? null
        : resultInstitution?.is_partner_not_applicable;

      await manager.getRepository(Result).update(resultId, {
        is_partner_not_applicable: tempIsPartnerNotApplicable,
      });

      const { institutions } = resultInstitution;
      let filteredInstitutions = [];

      if (!tempIsPartnerNotApplicable) {
        filteredInstitutions = institutions.filter(
          (institution) =>
            isEmpty(institution?.institution_role_id) ||
            institution?.institution_role_id == InstitutionRolesEnum.PARTNERS,
        );
      }
      if (isAi && resultInstitution?.institutions_ai) {
        await this.insertInstitutionsAi(
          resultId,
          resultInstitution.institutions_ai,
          InstitutionRolesEnum.PARTNERS,
          manager,
        );
      }

      const resResultInstitution = await this.create<InstitutionRolesEnum>(
        resultId,
        filteredInstitutions,
        'institution_id',
        InstitutionRolesEnum.PARTNERS,
        manager,
      );

      this._updateDataUtil.updateLastUpdatedDate(resultId, manager);

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

  async findAll(
    resultId: number,
    institution_role_id?: InstitutionRolesEnum,
  ): Promise<CreateResultInstitutionDto> {
    const institutio = await this.mainRepo.find({
      where: {
        institution_role_id: institution_role_id,
        result_id: resultId,
        is_active: true,
      },
      relations: {
        institution: {
          institution_type: true,
        },
      },
    });

    let is_partner_not_applicable = undefined;
    if (institution_role_id === InstitutionRolesEnum.PARTNERS) {
      const result = await this.dataSource.getRepository(Result).findOne({
        where: {
          result_id: resultId,
          is_active: true,
        },
        select: {
          is_partner_not_applicable: true,
        },
      });
      is_partner_not_applicable = result?.is_partner_not_applicable;
    }

    return {
      institutions: institutio,
      is_partner_not_applicable,
    };
  }

  private filterInstitutions(
    institutions: ResultInstitution[],
    session_type?: SessionFormatEnum,
  ): ResultInstitution[] {
    const institutionMap = new Map<number, ResultInstitution>();
    let comparerInstitutionRole: InstitutionRolesEnum;

    switch (session_type) {
      case SessionFormatEnum.GROUP:
        comparerInstitutionRole =
          InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE;
        break;
      case SessionFormatEnum.INDIVIDUAL:
        comparerInstitutionRole = InstitutionRolesEnum.TRAINEE_AFFILIATION;
        break;
      default:
        comparerInstitutionRole = InstitutionRolesEnum.PARTNERS;
        break;
    }

    for (const institution of institutions) {
      const existing = institutionMap.get(institution.institution_id);
      if (
        !existing ||
        (institution.institution_role_id === comparerInstitutionRole &&
          existing.institution_role_id !== comparerInstitutionRole)
      ) {
        institutionMap.set(institution.institution_id, institution);
      }
    }

    return Array.from(institutionMap.values());
  }
}
