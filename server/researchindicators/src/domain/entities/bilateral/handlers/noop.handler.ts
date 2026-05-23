import { BadRequestException, Injectable } from '@nestjs/common';
import { ContributionDto } from '../dto/upsert-indicator-mapping.dto';
import {
  BilateralHandlerContext,
  BilateralIndicatorTypeHandler,
} from './bilateral-indicator-type-handler.interface';

@Injectable()
export class NoopBilateralIndicatorTypeHandler
  implements BilateralIndicatorTypeHandler
{
  readonly indicatorType = 'NOOP';

  validate(dto: ContributionDto): void {
    if (!dto?.narrative) {
      throw new BadRequestException('narrative is required');
    }
  }

  async upsert(
    _ctx: BilateralHandlerContext,
    dto: ContributionDto,
  ): Promise<{ fkField: string; fkId: number }> {
    this.validate(dto);
    return { fkField: null, fkId: null };
  }

  async delete(_ctx: BilateralHandlerContext): Promise<void> {
    return undefined;
  }
}
