import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AgressoContract } from './entities/agresso-contract.entity';
import { AgressoContractWhere } from './dto/agresso-contract.dto';
import { cleanObject, parseBoolean } from '../../shared/utils/object.utils';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { StringKeys } from '../../shared/global-dto/types-global';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { OrderFieldsEnum } from './enum/order-fields.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { OpenSearchAgressoContractApi } from '../../tools/open-search/agresso-contract/agresso-contract.opensearch.api';
import { AppConfig } from '../../shared/utils/app-config.util';
import {
  ContractTopPrimaryLeversReportDto,
  PrimaryLeverCountDto,
} from './dto/reports-primary-levers.dto';
import { resolveLeverIconUrl } from '../../tools/clarisa/entities/clarisa-levers/lever-icon.util';
import { ClarisaLeversService } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { BilateralProjectMappingRepository } from '../bilateral-project-mapping/repositories/bilateral-project-mapping.repository';
import { isAcceptedSpStatus } from '../bilateral/utils/sp-mapping.predicate';
import { ENV } from '../../shared/utils/env.utils';
import { LoggerUtil } from '../../shared/utils/logger.util';
import {
  ContractClarisaProjectDto,
  ContractClarisaScienceProgramAllocationDto,
} from './dto/contract-clarisa-project.dto';

@Injectable()
export class AgressoContractService {
  private readonly logger = new LoggerUtil({
    name: AgressoContractService.name,
  });

  constructor(
    private readonly dataSource: DataSource,
    private readonly _agressoContractRepository: AgressoContractRepository,
    private readonly currentUser: CurrentUserUtil,
    // OpenSearchAgressoContractApi is REQUEST-scoped (transitive through
    // AgressoContractRepository -> CurrentUserUtil). Constructor-injecting it
    // here cascades extra REQUEST-scope depth into ResultsService (which
    // injects AgressoContractService), tripping the ResultsService ↔
    // ResultOicrService forwardRef empty-shell cycle. Lazy-resolved at the
    // single usage site via moduleRef instead. See design.md §3.4.
    //
    // ClarisaProjectsService (singleton-scoped) is ALSO resolved lazily via
    // moduleRef at its single usage site (findClarisaProjectByAgreementId) —
    // see docs/specs/changes/executive-overview-grounded-context/design.md
    // §2.1. Keeps the same lazy-resolution idiom as OpenSearch above rather
    // than adding another constructor-injected dependency.
    private readonly moduleRef: ModuleRef,
    private readonly appConfig: AppConfig,
    private readonly clarisaLeversService: ClarisaLeversService,
    private readonly bilateralProjectMappingRepository: BilateralProjectMappingRepository,
  ) {}

  async findContracts(
    where: AgressoContractWhere,
    pagination: PaginationDto,
    relations: Partial<StringKeys<AgressoContract>>,
  ) {
    const whereClean = cleanObject<AgressoContractWhere>(where);
    const relationsClean = parseBoolean<StringKeys<AgressoContract>>(relations);

    return this._agressoContractRepository.findAllContracts(
      pagination,
      whereClean,
      relationsClean,
    );
  }

  async findOne(contractId: string) {
    return this._agressoContractRepository.findOne({
      where: {
        agreement_id: contractId,
      },
    });
  }

  async findByName(
    first_name: string,
    last_name: string,
  ): Promise<AgressoContract[]> {
    return this._agressoContractRepository.findByName(first_name, last_name);
  }

  async findContractsResultByCurrentUser() {
    return this._agressoContractRepository.findContractsByUser(
      this.currentUser.user_id,
    );
  }

  async findContratResultByContractId(contract_id: string) {
    const contract =
      await this._agressoContractRepository.findOneContract(contract_id);
    if (!contract) {
      return null;
    }

    const leverShortName = this.clarisaLeversService.homologatedData(
      (contract as unknown as { departmentId: string }).departmentId,
    );

    const lever =
      await this.clarisaLeversService.findByShortName(leverShortName);

    const icon = this.clarisaLeversService.resolveIconUrl(
      lever.short_name,
      lever.full_name,
      lever.id,
    );

    return {
      ...contract,
      lever: leverShortName
        ? {
            ...lever,
            icon,
          }
        : null,
    };
  }

  async findAgressoContracts(
    onlyCurrentUser: TrueFalseEnum,
    filter?: Record<string, any>,
    orderFields?: OrderFieldsEnum,
    direction: 'ASC' | 'DESC' = 'ASC',
    pagination?: { page: number; limit: number },
    query?: string,
  ) {
    return this._agressoContractRepository.getContracts(
      filter,
      onlyCurrentUser == TrueFalseEnum.TRUE ? this.currentUser.user : null,
      orderFields,
      direction,
      pagination,
      query,
    );
  }

  async setPoolFundingTag(
    contractCode: string,
    value: boolean,
    user?: Pick<User, 'sec_user_id'>,
  ): Promise<AgressoContract> {
    const contract = await this._agressoContractRepository.findOne({
      where: { agreement_id: contractCode },
      relations: { pooled_funding_contracts: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (!this.isBilateralTagTarget(contract)) {
      throw new BadRequestException(
        'Only bilateral non-pooled funding contracts can be tagged as pool funding contributors',
      );
    }

    contract.is_pool_funding_contributor = value;
    contract.updated_by = user?.sec_user_id ?? this.currentUser.user_id;

    const savedContract = await this._agressoContractRepository.save(contract);

    // Lazy-resolve to avoid REQUEST-scope cascade in constructor (see §3.4).
    const openSearchApi = await this.moduleRef.resolve(
      OpenSearchAgressoContractApi,
      undefined,
      { strict: false },
    );
    void openSearchApi.uploadSingleToOpenSearch(savedContract);

    return savedContract;
  }

  private isBilateralTagTarget(contract: AgressoContract): boolean {
    const hasActivePooledFundingContract =
      contract.pooled_funding_contracts?.some((item) => item.is_active) ??
      false;

    // AGRESSO funding_type uses short codes: 'BLR' = Bilateral, 'POL' = Pooled, etc.
    // We accept either the short code or the long form for forward-compat.
    const fundingType = contract.funding_type?.toUpperCase();
    const isBilateralFunding =
      fundingType === 'BLR' || fundingType === 'BILATERAL';

    return isBilateralFunding && !hasActivePooledFundingContract;
  }

  async getContractDashboard(contractId: string) {
    return this._agressoContractRepository.getContractDashboard(contractId);
  }

  async getIndicatorDetailsReport(contractId: string) {
    return this._agressoContractRepository.getIndicatorDetailsReport(
      contractId,
    );
  }

  async getInsightsReport(contractId: string) {
    return this._agressoContractRepository.getInsightsReport(contractId);
  }

  async getGeoScopeReport(contractId: string, limit?: number) {
    return this._agressoContractRepository.getGeoScopeReport(contractId, limit);
  }

  async getResultsSummaryReport(contractId: string) {
    return this._agressoContractRepository.getResultsSummaryReport(contractId);
  }

  async getSpAlignmentReport(contractId: string) {
    return this._agressoContractRepository.getSpAlignmentReport(contractId);
  }

  async getTopPartnersReport(contractId: string, limit?: number) {
    return this._agressoContractRepository.getTopPartnersReport(
      contractId,
      limit,
    );
  }

  async getTopContributorsReport(contractId: string, limit?: number) {
    return this._agressoContractRepository.getTopContributorsReport(
      contractId,
      limit,
    );
  }

  async getTopMainContactPersonsReport(contractId: string, limit?: number) {
    return this._agressoContractRepository.getTopMainContactPersonsReport(
      contractId,
      limit,
    );
  }

  async getContractStaffReport(contractId: string) {
    return this._agressoContractRepository.getContractStaffReport(contractId);
  }

  async getTopPrimaryLeversReport(
    contractId: string,
    limit?: number,
  ): Promise<ContractTopPrimaryLeversReportDto> {
    const report =
      await this._agressoContractRepository.getTopPrimaryLeversReport(
        contractId,
        limit,
      );

    return {
      ...report,
      top_primary_levers: report.top_primary_levers,
    };
  }

  private mapPrimaryLeverWithIcon(
    lever: PrimaryLeverCountDto,
  ): PrimaryLeverCountDto {
    return {
      lever_id: Number(lever.lever_id),
      short_name: lever.short_name,
      full_name: lever.full_name,
      count: Number(lever.count),
      icon: resolveLeverIconUrl(this.appConfig.BUCKET_URL, {
        shortName: lever.short_name,
        fullName: lever.full_name,
        leverId: Number(lever.lever_id),
      }),
    };
  }

  async getFundingTypes() {
    return this._agressoContractRepository.getFundingTypes();
  }

  // @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-01 / R-EOC-001, design.md §2.1/§5.1
  //
  // Looks up the bilateral_project_mapping row for this Agresso agreement,
  // then fetches the mapped CLARISA project. Unmapped contract -> data:
  // null (R-EOC-001 AC.2, D-EOC-6) — this is the normal/majority case, not
  // an error. Cold-cache CLARISA failure -> data: null + errors:
  // ['clarisa_unavailable'] + a LoggerUtil warn (R-EOC-001 AC.4, NFR-2) —
  // never a 5xx propagated to the dashboard.
  async findClarisaProjectByAgreementId(agreementId: string): Promise<{
    data: ContractClarisaProjectDto | null;
    errors: string[];
  }> {
    const errors: string[] = [];
    const trimmedAgreementId = agreementId?.trim();

    if (!trimmedAgreementId) {
      return { data: null, errors };
    }

    const mapping = await this.bilateralProjectMappingRepository.findOne({
      where: {
        agresso_agreement_id: trimmedAgreementId,
        is_active: true,
      },
      order: { updated_at: 'DESC' },
    });

    if (!mapping) {
      return { data: null, errors };
    }

    // Lazy-resolve to keep AgressoContractService's constructor free of an
    // extra provider whose only consumer is this method (see §3.4-style
    // rationale in the constructor comment above).
    const clarisaProjectsService = await this.moduleRef.resolve(
      ClarisaProjectsService,
      undefined,
      { strict: false },
    );

    let project: ClarisaProject | null;
    try {
      project = await clarisaProjectsService.findProjectById(
        mapping.clarisa_project_id,
      );
    } catch (err) {
      if (err instanceof ServiceUnavailableException) {
        this.logger.warn(
          `[findClarisaProjectByAgreementId] CLARISA cold-cache degrade for agreementId=${trimmedAgreementId}, clarisa_project_id=${mapping.clarisa_project_id}: ${
            (err as Error)?.message ?? err
          }`,
        );
        errors.push('clarisa_unavailable');
        return { data: null, errors };
      }
      throw err;
    }

    if (!project) {
      return { data: null, errors };
    }

    return { data: this.toContractClarisaProjectDto(project), errors };
  }

  private toContractClarisaProjectDto(
    project: ClarisaProject,
  ): ContractClarisaProjectDto {
    return {
      id: project.id,
      short_name: project.short_name,
      full_name: project.full_name,
      summary: project.summary,
      description: project.description,
      start_date: project.start_date,
      end_date: project.end_date,
      total_budget: project.total_budget,
      annual: project.annual,
      funder_institution: project.funder_institution_object
        ? {
            id: project.funder_institution_object.id,
            name: project.funder_institution_object.name,
            acronym: project.funder_institution_object.acronym ?? null,
          }
        : null,
      lead_institution: project.lead_institution_object
        ? {
            id: project.lead_institution_object.id,
            name: project.lead_institution_object.name,
            acronym: project.lead_institution_object.acronym ?? null,
          }
        : null,
      external_code: project.external_code ?? null,
      phase: project.phase ?? null,
      science_programs: this.mapAcceptedSciencePrograms(project),
    };
  }

  // Mirrors ClarisaProjectsService.hasSciencePrograms' predicate (accepted
  // status + cgiar_entity_type_object.code === 22, design.md §3) but
  // projects the qualifying mappings into {code, name, allocation} instead
  // of collapsing to a boolean.
  private mapAcceptedSciencePrograms(
    project: ClarisaProject,
  ): ContractClarisaScienceProgramAllocationDto[] {
    const acceptedStatuses = ENV.BILATERAL_ACCEPTED_SP_STATUSES;
    return (project.project_mappings_array ?? [])
      .filter(
        (mapping) =>
          isAcceptedSpStatus(mapping.status, acceptedStatuses) &&
          mapping.global_unit_object?.cgiar_entity_type_object?.code === 22,
      )
      .map((mapping) => ({
        code: mapping.global_unit_object.smo_code,
        name: mapping.global_unit_object.name,
        allocation: mapping.allocation,
      }));
  }
}
