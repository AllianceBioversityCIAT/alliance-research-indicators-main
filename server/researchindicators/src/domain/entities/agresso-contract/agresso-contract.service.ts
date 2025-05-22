import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AgressoContract } from './entities/agresso-contract.entity';
import { AgressoContractWhere } from './dto/agresso-contract.dto';
import { cleanObject, parseBoolean } from '../../shared/utils/object.utils';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { StringKeys } from '../../shared/global-dto/types-global';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class AgressoContractService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _agressoContractRepository: AgressoContractRepository,
    private readonly currentUser: CurrentUserUtil,
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
}
