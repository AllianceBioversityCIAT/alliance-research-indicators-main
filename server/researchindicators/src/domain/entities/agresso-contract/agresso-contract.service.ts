import { Injectable } from '@nestjs/common';
import { DataSource, FindManyOptions } from 'typeorm';
import { AgressoContract } from './entities/agresso-contract.entity';
import { AgressoContractWhere } from './dto/agresso-contract.dto';
import { cleanObject, parseBoolean } from '../../shared/utils/object.utils';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { StringKeys } from '../../shared/global-dto/types-global';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';

@Injectable()
export class AgressoContractService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _agressoContractRepository: AgressoContractRepository,
  ) {}

  async findContracts(
    where: AgressoContractWhere,
    pagination: PaginationDto,
    relations: Partial<StringKeys<AgressoContract>>,
  ) {
    const whereClean = cleanObject<AgressoContractWhere>(where);
    const paginationClean = cleanObject<PaginationDto>(pagination);
    const findQuery: FindManyOptions<AgressoContract> = {};

    if (Object.keys(whereClean).length !== 0) findQuery.where = whereClean;

    if (Object.keys(paginationClean).length === 2) {
      const offset = (paginationClean.page - 1) * paginationClean.limit;
      findQuery.take = paginationClean.limit;
      findQuery.skip = offset;
    }
    if (Object.keys(relations).length !== 0) {
      findQuery.relations =
        parseBoolean<StringKeys<AgressoContract>>(relations);
    }
    return this.dataSource.getRepository(AgressoContract).find(findQuery);
  }

  async findByName(
    first_name: string,
    last_name: string,
  ): Promise<AgressoContract[]> {
    return this._agressoContractRepository.findByName(first_name, last_name);
  }
}
