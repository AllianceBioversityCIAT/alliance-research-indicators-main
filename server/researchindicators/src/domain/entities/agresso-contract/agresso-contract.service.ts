import { Injectable } from '@nestjs/common';
import { AgressoContractRawDto } from './dto/agresso-contract-raw.dto';
import { AgressoContractMapper } from '../../shared/mappers/agresso-contract.mapper';
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

  async uploadAgressoContracts(active: boolean = false) {
    const dataResponse = JSON.parse('{"data":[]}');
    const agressoContract: AgressoContractRawDto[] =
      dataResponse as unknown as AgressoContractRawDto[];

    const prepareToSave = agressoContract.map((data) =>
      AgressoContractMapper(data),
    );

    if (!active) return;
    this.dataSource.transaction(async (manager) => {
      for (let id = 0; id < prepareToSave.length; id += 100) {
        const data = prepareToSave.slice(id, id + 100);
        await manager.getRepository(AgressoContract).save(data);
      }
    });
  }

  async findByName(
    first_name: string,
    last_name: string,
  ): Promise<AgressoContract[]> {
    return this._agressoContractRepository.findByName(first_name, last_name);
  }
}
