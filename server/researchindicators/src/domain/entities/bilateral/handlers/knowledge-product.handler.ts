import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ResultKnowledgeProductService } from '../../result-knowledge-product/result-knowledge-product.service';
import { ResultKnowledgeProduct } from '../../result-knowledge-product/entities/result-knowledge-product.entity';
import { ContributionDto } from '../dto/upsert-indicator-mapping.dto';
import {
  BilateralHandlerContext,
  BilateralIndicatorTypeHandler,
} from './bilateral-indicator-type-handler.interface';

@Injectable()
export class KnowledgeProductBilateralIndicatorTypeHandler
  implements BilateralIndicatorTypeHandler
{
  readonly indicatorType = 'knowledge_product';

  constructor(
    private readonly knowledgeProductService: ResultKnowledgeProductService,
  ) {}

  validate(dto: ContributionDto): void {
    this.requireFields(dto, [
      'handle',
      'knowledge_product_type',
      'licence',
      'peer_reviewed',
      'is_isi',
      'accessibility',
    ]);
  }

  async upsert(
    ctx: BilateralHandlerContext,
    dto: ContributionDto,
  ): Promise<{ fkField: string; fkId: number }> {
    this.validate(dto);
    await this.ensureResultTypeRow(ctx);
    await this.knowledgeProductService.update(ctx.resultId, {
      type: String(dto.knowledge_product_type),
      citation: String(dto.handle),
      open_access: Boolean(dto.accessibility),
    } as ResultKnowledgeProduct);

    return { fkField: 'result_knowledge_product_id', fkId: ctx.resultId };
  }

  async delete(ctx: BilateralHandlerContext): Promise<void> {
    await ctx.manager
      ?.getRepository(ResultKnowledgeProduct)
      .update(ctx.resultId, {
        is_active: false,
        deleted_at: new Date(),
      });
  }

  private async ensureResultTypeRow(
    ctx: BilateralHandlerContext,
  ): Promise<void> {
    try {
      await this.knowledgeProductService.create(ctx.resultId, ctx.manager);
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
