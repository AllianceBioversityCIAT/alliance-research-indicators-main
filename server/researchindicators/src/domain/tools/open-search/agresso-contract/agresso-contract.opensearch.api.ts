import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseOpenSearchApi } from '../core/base-open-search-api';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { AgressoContract } from '../../../entities/agresso-contract/entities/agresso-contract.entity';
import { AgressoContractRepository } from '../../../entities/agresso-contract/repositories/agresso-contract.repository';
import { AgressoContractOpensearchDto } from './dto/agresso-contract.opensearch.dto';

@Injectable()
export class OpenSearchAgressoContractApi extends BaseOpenSearchApi<
  AgressoContract,
  AgressoContractOpensearchDto,
  AgressoContractRepository
> {
  constructor(
    httpService: HttpService,
    mainRepo: AgressoContractRepository,
    appConfig: AppConfig,
  ) {
    super(
      httpService,
      mainRepo,
      appConfig,
      undefined,
      AgressoContractOpensearchDto,
    );
  }
}
