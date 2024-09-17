import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, In, Not, Repository } from 'typeorm';
import { ResultContract } from './entities/result-contract.entity';
import { ContractRolesEnum } from './enum/lever-roles.enum';
import { ResultContractsRepository } from './repositories/result-contracts.repository';

@Injectable()
export class ResultContractsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mainRepo: ResultContractsRepository,
  ) {}

  async create(
    result_id: number,
    contract_id: string,
    contract_role_id: ContractRolesEnum,
  ) {
    const existData = await this.mainRepo.findOne({
      where: {
        result_id: result_id,
        contract_id: contract_id,
        contract_role_id: contract_role_id,
        is_active: true,
      },
    });

    await this.mainRepo.updateActiveStatus({
      contract_id: contract_id,
      result_id: result_id,
      contract_role_id: contract_role_id,
      not_in: { result_id: existData?.result_contract_id },
    });

    if (existData && existData.is_active) {
      throw new ConflictException('Result contract already exists');
    }

    let tempProces: ResultContract;
    if (existData && !existData.is_active) {
      await this.mainRepo.update(existData.result_contract_id, {
        is_active: true,
      });
      tempProces = { ...existData, is_active: true };
    } else if (!existData) {
      tempProces = await this.mainRepo.save({
        result_id: result_id,
        contract_id: contract_id,
        contract_role_id: contract_role_id,
      });
    }

    return tempProces;
  }
}
