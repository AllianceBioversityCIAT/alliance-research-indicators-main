import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class AgressoContractService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _agressoContractRepository: AgressoContractRepository,
    private readonly currentUser: CurrentUserUtil,
    private readonly _openSearchAgressoContractApi: OpenSearchAgressoContractApi,
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
    this._openSearchAgressoContractApi.uploadSingleToOpenSearch(savedContract);

    return savedContract;
  }

  private isBilateralTagTarget(contract: AgressoContract): boolean {
    const hasActivePooledFundingContract =
      contract.pooled_funding_contracts?.some((item) => item.is_active) ??
      false;

    return (
      contract.funding_type?.toUpperCase() === 'BILATERAL' &&
      !hasActivePooledFundingContract
    );
  }
}
