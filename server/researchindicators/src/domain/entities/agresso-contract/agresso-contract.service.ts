import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

@Injectable()
export class AgressoContractService {
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
    private readonly moduleRef: ModuleRef,
    private readonly appConfig: AppConfig,
    private readonly clarisaLeversService: ClarisaLeversService,
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

  async getGeoScopeReport(contractId: string, limit?: number) {
    return this._agressoContractRepository.getGeoScopeReport(contractId, limit);
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
      top_primary_levers: report.top_primary_levers.map((lever) =>
        this.mapPrimaryLeverWithIcon(lever),
      ),
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
}
