import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateAgressoContractDto } from './dto/create-agresso-contract.dto';
import { UpdateAgressoContractDto } from './dto/update-agresso-contract.dto';
import { Envelope } from './sources/example-data.json';
import { AgressoContractRawDto } from './dto/agresso-contract-raw.dto';
import { AgressoContractMapper } from '../../shared/mappers/agresso-contract.mapper';
import { DataSource, FindManyOptions, FindOptionsRelations } from 'typeorm';
import { AgressoContract } from './entities/agresso-contract.entity';
import { AgressoContractWhere } from './dto/agresso-contract.dto';
import { cleanObject, parseBoolean } from '../../shared/utils/object.utils';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';

@Injectable()
export class AgressoContractService {
  constructor(private readonly dataSource: DataSource) {}

  async findContracts(
    where: AgressoContractWhere,
    pagination: PaginationDto,
    relations: Partial<StringKeys<AgressoContract>>,
  ) {
    const whereClean = cleanObject<AgressoContractWhere>(where);
    const paginationClean = cleanObject<PaginationDto>(pagination);
    let findQuery: FindManyOptions<AgressoContract> = {};

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
    return this.dataSource
      .getRepository(AgressoContract)
      .find(findQuery)
      .then((data) =>
        ResponseUtils.format({
          description: 'Contracts found',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }

  async uploadAgressoContracts() {
    const { return: dataResponse } = Envelope.Body.getAgreementsRMResponse;
    const agressoContract: AgressoContractRawDto[] =
      dataResponse as unknown as AgressoContractRawDto[];

    const prepareToSave = agressoContract.map((data) =>
      AgressoContractMapper(data),
    );

    this.dataSource.transaction(async (manager) => {
      for (let id = 0; id < prepareToSave.length; id += 100) {
        const data = prepareToSave.slice(id, id + 100);
        await manager.getRepository(AgressoContract).save(data);
      }
    });
  }
}
