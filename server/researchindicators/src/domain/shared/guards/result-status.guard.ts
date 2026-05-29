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
import { CurrentUserUtil } from '../utils/current-user.util';
import { SecRolesEnum } from '../enum/sec_role.enum';

@Injectable()
export class ResultStatusGuard implements CanActivate {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _resultsUtil: ResultsUtil,
    private readonly _currentUserUtil: CurrentUserUtil,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this._resultsUtil.setup();

    const bypassRoles = [
      SecRolesEnum.SYSTEM_ADMIN,
      SecRolesEnum.TECHNICAL_SUPPORT,
      SecRolesEnum.CENTER_ADMIN,
    ];

    if (
      this._currentUserUtil.user.roles.some((role) =>
        bypassRoles.includes(role),
      )
    ) {
      return true;
    }

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
      ].includes(result.result_status_id)
    ) {
      throw new BadRequestException(
        `Only results in ${[
          ResultStatusNameEnum[ResultStatusEnum.DRAFT],
          ResultStatusNameEnum[ResultStatusEnum.REVISED],
          ResultStatusNameEnum[ResultStatusEnum.SCIENCE_EDITION],
          ResultStatusNameEnum[ResultStatusEnum.KM_CURATION],
        ].join(', ')} status can be edited`,
      );
    }

    return true;
  }
}
