import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';
import {
  ResultStatusEnum,
  ResultStatusNameEnum,
} from '../../entities/result-status/enum/result-status.enum';
import { ResultsUtil } from '../utils/results.util';

@Injectable()
export class ResultStatusGuard implements CanActivate {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this._resultsUtil.setup();
    const result = await this.dataSource.getRepository(Result).findOne({
      where: {
        result_id: this._resultsUtil.resultId,
        is_active: true,
      },
    });

    if (
      ![
        ResultStatusEnum.DRAFT,
        ResultStatusEnum.REVISED,
        ResultStatusEnum.SCIENCE_EDITION,
        ResultStatusEnum.KM_CURATION,
        ResultStatusEnum.PUBLISHED,
      ].includes(result.result_status_id)
    ) {
      throw new BadRequestException(
        `Only results in ${[
          ResultStatusNameEnum[ResultStatusEnum.DRAFT],
          ResultStatusNameEnum[ResultStatusEnum.REVISED],
          ResultStatusNameEnum[ResultStatusEnum.SCIENCE_EDITION],
          ResultStatusNameEnum[ResultStatusEnum.KM_CURATION],
          ResultStatusNameEnum[ResultStatusEnum.PUBLISHED],
        ].join(', ')} status can be edited`,
      );
    }

    return true;
  }
}
