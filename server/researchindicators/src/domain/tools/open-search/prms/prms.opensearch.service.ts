import { Injectable } from '@nestjs/common';
import { BaseExternalOpenSearchApi } from '../core/external-base-open-search-api';
import { PrmsResponseDto } from './dto/prms-response.dto';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../../shared/utils/app-config.util';
import {
  ExternalMappersDto,
  ExternalMappersInterface,
} from '../../../shared/global-dto/external-mappers.dto';

@Injectable()
export class PrmsOpenSearchService
  extends BaseExternalOpenSearchApi<PrmsResponseDto>
  implements ExternalMappersInterface<PrmsResponseDto>
{
  constructor(
    httpService: HttpService,
    private readonly appConfig: AppConfig,
  ) {
    super(
      httpService,
      appConfig,
      appConfig.OPEN_SEARCH_PRMS_HOST,
      appConfig.OPEN_SEARCH_PRMS_USER,
      appConfig.OPEN_SEARCH_PRMS_PASS,
      'result_id',
      ['prms-results-knowledge_product'],
    );
  }

  async mapToExternalCreateResultDto(
    res: PrmsResponseDto[],
  ): Promise<ExternalMappersDto[]> {
    const externalDtos: ExternalMappersDto[] = [];
    for (const record of res) {
      const externalDto = new ExternalMappersDto();
      externalDto.createResult;
      return externalDtos;
    }
  }

  async createExternalResultAlignmentDto(
    res: ExternalMappersDto[],
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getData() {
    const size = 50;
    let from = 0;
    let keepGoing = true;
    while (keepGoing) {
      const response = await this.search(undefined, {}, size, from);
      response.data.map((item) => console.log(item.result_id));
      if (response.currentSize < size) {
        keepGoing = false;
      }
      console.log('test');
      from += size;
    }
  }
}
