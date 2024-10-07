import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ResultContract } from './entities/result-contract.entity';
import { ContractRolesEnum } from './enum/lever-roles.enum';
import { ResultContractsRepository } from './repositories/result-contracts.repository';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
import { selectManager } from '../../shared/utils/orm.util';

@Injectable()
export class ResultContractsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mainRepo: ResultContractsRepository,
  ) {}

  async create(
    result_id: number,
    contract: Partial<ResultContract> | Partial<ResultContract>[],
    contract_role_id: ContractRolesEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultContract> = selectManager(
      manager,
      ResultContract,
      this.mainRepo,
    );

    const contractArray = Array.isArray(contract) ? contract : [contract];

    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        contract_role_id: contract_role_id,
        contract_id: In(contractArray.map((data) => data.contract_id)),
      },
    });

    const formatContract: Partial<ResultContract>[] = contractArray.map(
      (data) => ({
        result_contract_id: data?.result_contract_id,
        contract_role_id: contract_role_id,
        contract_id: data.contract_id,
      }),
    );

    const updateResultLever = updateArray<ResultContract>(
      formatContract,
      existData,
      'contract_id',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_contract_id',
    );

    const persistId = filterPersistKey<ResultContract>(
      'result_contract_id',
      updateResultLever,
    );

    await entityManager.update(
      {
        result_id: result_id,
        contract_role_id: contract_role_id,
        result_contract_id: Not(In(persistId)),
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
}
