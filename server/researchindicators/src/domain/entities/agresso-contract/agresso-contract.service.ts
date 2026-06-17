import { Injectable } from '@nestjs/common';
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
import { AppConfig } from '../../shared/utils/app-config.util';
import {
  ContractTopPrimaryLeversReportDto,
  PrimaryLeverCountDto,
} from './dto/reports-primary-levers.dto';
import { resolveLeverIconUrl } from '../../tools/clarisa/entities/clarisa-levers/lever-icon.util';

@Injectable()
export class AgressoContractService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _agressoContractRepository: AgressoContractRepository,
    private readonly currentUser: CurrentUserUtil,
    private readonly appConfig: AppConfig,
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
    return this._agressoContractRepository.findOneContract(contract_id);
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
}
