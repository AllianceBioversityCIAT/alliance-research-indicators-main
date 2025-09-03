import { Injectable } from '@nestjs/common';
import { ResultInstitution } from './entities/result-institution.entity';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { isEmpty } from '../../shared/utils/object.utils';
import { SessionFormatEnum } from '../session-formats/enums/session-format.enum';
import { ResultCapacitySharing } from '../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { Result } from '../results/entities/result.entity';
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

  async updatePartners(
    resultId: number,
    resultInstitution: CreateResultInstitutionDto,
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
    const where: FindOptionsWhere<ResultInstitution> = {};

    if (
      institution_role_id &&
      institution_role_id == InstitutionRolesEnum.PARTNERS
    ) {
      where.institution_role_id = In([
        InstitutionRolesEnum.PARTNERS,
        InstitutionRolesEnum.TRAINEE_ORGANIZATION_REPRESENTATIVE,
        InstitutionRolesEnum.TRAINEE_AFFILIATION,
      ]);
    } else if (institution_role_id) {
      where.institution_role_id = institution_role_id;
    }

    let institutio = await this.mainRepo.find({
      where: {
        ...where,
        result_id: resultId,
        is_active: true,
      },
      relations: {
        institution: {
          institution_type: true,
        },
      },
    });

    if (
      institution_role_id &&
      institution_role_id == InstitutionRolesEnum.PARTNERS
    ) {
      const capSharingType: SessionFormatEnum = await this.dataSource
        .getRepository(ResultCapacitySharing)
        .findOne({
          where: {
            result_id: resultId,
            is_active: true,
          },
          select: {
            session_format_id: true,
          },
        })
        .then((result) => result?.session_format_id ?? null);
      institutio = this.filterInstitutions(institutio, capSharingType);
    }

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
