import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ResultInnovationDevService } from '../../result-innovation-dev/result-innovation-dev.service';
import { ResultInnovationDev } from '../../result-innovation-dev/entities/result-innovation-dev.entity';
import { ContributionDto } from '../dto/upsert-indicator-mapping.dto';
import {
  BilateralHandlerContext,
  BilateralIndicatorTypeHandler,
} from './bilateral-indicator-type-handler.interface';

@Injectable()
export class InnovationDevelopmentBilateralIndicatorTypeHandler
  implements BilateralIndicatorTypeHandler
{
  readonly indicatorType = 'innovation_development';

  constructor(
    private readonly innovationDevService: ResultInnovationDevService,
  ) {}

  validate(dto: ContributionDto): void {
    this.requireFields(dto, [
      'innovation_typology',
      'innovation_developers',
      'readinness_level_id',
    ]);

    if (typeof dto.innovation_typology !== 'object') {
      throw new BadRequestException('innovation_typology.code is required');
    }

    if (!(dto.innovation_typology as Record<string, unknown>).code) {
      throw new BadRequestException('innovation_typology.code is required');
    }
  }

  async upsert(
    ctx: BilateralHandlerContext,
    dto: ContributionDto,
  ): Promise<{ fkField: string; fkId: number }> {
    this.validate(dto);
    await this.ensureResultTypeRow(ctx);
    await this.innovationDevService.update(ctx.resultId, {
      innovation_type_id: Number(
        (dto.innovation_typology as Record<string, unknown>).code,
      ),
      innovation_readiness_id: Number(dto.readinness_level_id),
      short_title: String(dto.innovation_developers),
      actors: [],
      institution_types: [],
    } as any);

    return { fkField: 'result_innovation_dev_id', fkId: ctx.resultId };
  }

  async delete(ctx: BilateralHandlerContext): Promise<void> {
    await ctx.manager?.getRepository(ResultInnovationDev).update(ctx.resultId, {
      is_active: false,
      deleted_at: new Date(),
    });
  }

  private async ensureResultTypeRow(
    ctx: BilateralHandlerContext,
  ): Promise<void> {
    try {
      await this.innovationDevService.create(ctx.resultId, ctx.manager);
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }
    }
  }

  private requireFields(dto: ContributionDto, fields: string[]): void {
    const missing = fields.filter((field) => {
      const value = dto?.[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length) {
      throw new BadRequestException(`${missing.join(', ')} required`);
    }
  }
}
