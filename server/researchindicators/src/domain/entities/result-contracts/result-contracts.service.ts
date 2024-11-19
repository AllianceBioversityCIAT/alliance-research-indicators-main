import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultContract } from './entities/result-contract.entity';
import { ResultContractsRepository } from './repositories/result-contracts.repository';
import { selectManager } from '../../shared/utils/orm.util';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ContractRolesEnum } from './enum/contract-roles.enum';

@Injectable()
export class ResultContractsService extends BaseServiceSimple<
  ResultContract,
  ResultContractsRepository
> {
  constructor(
    private readonly dataSource: DataSource,
    customRepo: ResultContractsRepository,
  ) {
    super(ResultContract, customRepo, 'result_id', 'contract_role_id');
  }

  async deleteAll(result_id: number, manager?: EntityManager) {
    const entityManager: Repository<ResultContract> = selectManager(
      manager,
      ResultContract,
      this.mainRepo,
    );
    return entityManager.update(
      { result_id: result_id },
      {
        is_active: false,
      },
    );
  }

  protected lastRefactoredAfterSave<ContractRolesEnum>(
    data: Partial<ResultContract>[],
    roleId?: ContractRolesEnum,
  ): Partial<ResultContract>[] {
    let dataToSave: Partial<ResultContract>[] = null;
    if (roleId === ContractRolesEnum.ALIGNMENT) {
      dataToSave = this.unsetMultiplesPrimary<ResultContract>(data);
    }
    return dataToSave ?? data;
  }
}
