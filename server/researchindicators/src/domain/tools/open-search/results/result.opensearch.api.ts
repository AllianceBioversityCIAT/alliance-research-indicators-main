import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseOpenSearchApi } from '../core/base-open-search-api';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';
import { Result } from '../../../entities/results/entities/result.entity';
import { ResultOpensearchDto } from './dto/result.opensearch.dto';

@Injectable()
export class OpenSearchResultApi extends BaseOpenSearchApi<
  Result,
  ResultOpensearchDto,
  ResultRepository
> {
  constructor(
    httpService: HttpService,
    countryRepository: ResultRepository,
    appConfig: AppConfig,
  ) {
    super(
      httpService,
      countryRepository,
      appConfig,
      undefined,
      ResultOpensearchDto,
    );
  }
}
