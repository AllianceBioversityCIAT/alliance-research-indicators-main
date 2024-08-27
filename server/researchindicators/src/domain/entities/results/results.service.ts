import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultRepository } from './repositories/result.repository';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { cleanObject } from '../../shared/utils/object.utils';
import { ResponseUtils } from '../../shared/utils/response.utils';

@Injectable()
export class ResultsService {
  constructor(
    private dataSource: DataSource,
    private readonly ResultRespository: ResultRepository,
  ) {}

  async findResults(pagination: PaginationDto) {
    const paginationClean = cleanObject<PaginationDto>(pagination);
    const whereLimit: Record<string, number> = {};
    if (Object.keys(paginationClean).length === 2) {
      const offset = (paginationClean.page - 1) * paginationClean.limit;
      whereLimit.limit = paginationClean.limit;
      whereLimit.offset = offset;
    }
    return this.ResultRespository.findResults(whereLimit).then((data) =>
      ResponseUtils.format({
        description: 'Results found',
        status: HttpStatus.OK,
        data: data,
      }),
    );
  }
}
