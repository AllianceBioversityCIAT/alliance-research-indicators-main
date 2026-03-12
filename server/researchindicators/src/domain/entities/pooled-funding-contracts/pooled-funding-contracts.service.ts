import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { PooledFundingContract } from './entities/pooled-funding-contract.entity';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';

@Injectable()
export class PooledFundingContractsService {
    private readonly mainRepo: Repository<PooledFundingContract>;
    constructor(
        private readonly dataSource: DataSource,
    ) {
        this.mainRepo = this.dataSource.getRepository(PooledFundingContract);
    }

    async findMappingPooledFundingContracts(pooledFundingOfficialCode: string): Promise<AgressoContract[]> {
        const pooledFundingContracts = await this.mainRepo.find({
            where: {
                cgiar_entity_code: pooledFundingOfficialCode,
            },
            relations: {
                agresso_contract: true,
            },
        });

        return pooledFundingContracts.map(contract => contract.agresso_contract);
    }
}
