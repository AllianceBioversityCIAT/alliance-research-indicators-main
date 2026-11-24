import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { In, Not } from 'typeorm';
import { isEmpty } from '../../../shared/utils/object.utils';
import { ResultStatusEnum } from '../../../entities/result-status/enum/result-status.enum';
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

  /**
   * H13 — the index keeps the status a result had when it was indexed, so a result
   * deleted without its index entry being removed still matches a search and then opens
   * as "Result not found". Keep only hits that are still active and not Deleted in MySQL.
   */
  async filterLiveResults<T extends { result_id?: number }>(
    hits: T[],
  ): Promise<T[]> {
    const ids = hits.map((hit) => hit.result_id).filter((id) => id != null);
    if (isEmpty(ids)) return [];
    const live = await this._mainRepo.find({
      select: { result_id: true },
      where: {
        result_id: In(ids),
        is_active: true,
        result_status_id: Not(ResultStatusEnum.DELETED),
      },
    });
    const liveIds = new Set(live.map(({ result_id }) => result_id));
    return hits.filter((hit) => liveIds.has(hit.result_id));
  }
}
