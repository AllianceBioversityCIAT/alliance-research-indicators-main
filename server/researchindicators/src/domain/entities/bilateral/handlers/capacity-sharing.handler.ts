import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ResultCapacitySharingService } from '../../result-capacity-sharing/result-capacity-sharing.service';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { SessionFormatEnum } from '../../session-formats/enums/session-format.enum';
import { ContributionDto } from '../dto/upsert-indicator-mapping.dto';
import {
  BilateralHandlerContext,
  BilateralIndicatorTypeHandler,
} from './bilateral-indicator-type-handler.interface';

@Injectable()
export class CapacitySharingBilateralIndicatorTypeHandler
  implements BilateralIndicatorTypeHandler
{
  readonly indicatorType = 'capacity_sharing';

  constructor(
    private readonly capacitySharingService: ResultCapacitySharingService,
  ) {}

  validate(dto: ContributionDto): void {
    this.requireFields(dto, [
      'women',
      'men',
      'non_binary',
      'has_unkown_using',
      'capdev_term_id',
      'capdev_delivery_method_id',
    ]);
  }

  async upsert(
    ctx: BilateralHandlerContext,
    dto: ContributionDto,
  ): Promise<{ fkField: string; fkId: number }> {
    this.validate(dto);
    await this.ensureResultTypeRow(ctx);
    await this.capacitySharingService.update(ctx.resultId, {
      session_format_id: SessionFormatEnum.GROUP,
      session_length_id: Number(dto.capdev_term_id),
      delivery_modality_id: Number(dto.capdev_delivery_method_id),
      group: {
        session_participants_female: Number(dto.women),
        session_participants_male: Number(dto.men),
        session_participants_non_binary: Number(dto.non_binary),
        session_participants_total:
          Number(dto.women) + Number(dto.men) + Number(dto.non_binary),
      } as any,
    });

    return { fkField: 'result_capacity_sharing_id', fkId: ctx.resultId };
  }

  async delete(ctx: BilateralHandlerContext): Promise<void> {
    await ctx.manager
      ?.getRepository(ResultCapacitySharing)
      .update(ctx.resultId, {
        is_active: false,
        deleted_at: new Date(),
      });
  }

  private async ensureResultTypeRow(
    ctx: BilateralHandlerContext,
  ): Promise<void> {
    try {
      await this.capacitySharingService.create(ctx.resultId, ctx.manager);
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
