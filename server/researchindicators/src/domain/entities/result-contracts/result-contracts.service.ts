import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ResultContract } from './entities/result-contract.entity';
import { ContractRolesEnum } from './enum/lever-roles.enum';
import { ResultContractsRepository } from './repositories/result-contracts.repository';
import { updateArray } from '../../shared/utils/array.util';
import { selectManager } from '../../shared/utils/orm.util';

@Injectable()
export class ResultContractsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mainRepo: ResultContractsRepository,
  ) {}

  async create(
    result_id: number,
    contract_id: string | string[],
    contract_role_id: ContractRolesEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultContract> = selectManager(
      manager,
      ResultContract,
      this.mainRepo,
    );

    let contractId = Array.isArray(contract_id) ? contract_id : [contract_id];

    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        contract_role_id: contract_role_id,
      },
    });

    const formatDataLever: Partial<ResultContract>[] = contractId.map(
      (data) => ({
        contract_role_id: contract_role_id,
        contract_id: data,
      }),
    );

    const updateResultLever = updateArray<ResultContract>(
      formatDataLever,
      existData,
      'result_contract_id',
      {
        key: 'result_id',
        value: result_id,
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
