import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultRepository } from './repositories/result.repository';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { cleanObject, validObject } from '../../shared/utils/object.utils';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Result } from './entities/result.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import { ContractRolesEnum } from '../result-contracts/enum/lever-roles.enum';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';

@Injectable()
export class ResultsService {
  constructor(
    private dataSource: DataSource,
    private readonly mainRepo: ResultRepository,
    private readonly _resultContractsService: ResultContractsService,
    private readonly _resultLeversService: ResultLeversService,
  ) {}

  async findResults(pagination: PaginationDto) {
    const paginationClean = cleanObject<PaginationDto>(pagination);
    const whereLimit: Record<string, number> = {};
    if (Object.keys(paginationClean).length === 2) {
      const offset = (paginationClean.page - 1) * paginationClean.limit;
      whereLimit.limit = paginationClean.limit;
      whereLimit.offset = offset;
    }
    return this.mainRepo.findResults(whereLimit).then((data) =>
      ResponseUtils.format({
        description: 'Results found',
        status: HttpStatus.OK,
        data: data,
      }),
    );
  }

  async createResult(createResult: CreateResultDto): Promise<Result> {
    const vaidRequest: boolean = validObject(createResult, ['levers']);
    if (!vaidRequest) throw new BadRequestException('Invalid request');

    const { description, indicator_id, title, contracts, levers } =
      createResult;

    await this.mainRepo.findOne({ where: { title } }).then((result) => {
      if (result) {
        throw ResponseUtils.format({
          description: 'Result already exists',
          status: HttpStatus.CONFLICT,
        });
      }
    });

    const newOfficialCode = await this.newOfficialCode();

    const result = await this.dataSource.transaction(async (manager) => {
      const result = await manager.withRepository(this.mainRepo).save({
        description,
        indicator_id,
        title,
        result_official_code: newOfficialCode,
      });

      await this._resultContractsService.create(
        result.result_id,
        contracts.map(({ agreement_id }) => agreement_id),
        ContractRolesEnum.PRIMARY,
        manager,
      );

      await this._resultLeversService.create(
        result.result_id,
        levers.map(({ code }) => code),
        LeverRolesEnum.PRIMARY,
        manager,
      );

      return result;
    });

    return result;
  }

  private async newOfficialCode() {
    const firstInsertion: number = 1;
    const lastCode: number = await this.mainRepo
      .findOne({ order: { result_official_code: 'DESC' } })
      .then(({ result_official_code }) =>
        result_official_code ? result_official_code++ : firstInsertion,
      );

    return lastCode;
  }

  async updateGeneralInformation() {}
}
