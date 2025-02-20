import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';

@Injectable()
export class ResultStatusGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const resultId = request.params.resultId;

    console.log(resultId);

    const result = await this.dataSource.getRepository(Result).findOne({
      where: {
        result_id: resultId,
        is_active: true,
      },
    });

    if (result.result_status_id !== ResultStatusEnum.EDITING) {
      throw new BadRequestException(
        'Only results in editing status can be edited',
      );
    }

    return true;
  }
}
