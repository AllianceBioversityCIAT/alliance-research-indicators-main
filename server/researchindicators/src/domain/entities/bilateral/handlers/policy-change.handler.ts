import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ResultPolicyChangeService } from '../../result-policy-change/result-policy-change.service';
import { ResultPolicyChange } from '../../result-policy-change/entities/result-policy-change.entity';
import { ContributionDto } from '../dto/upsert-indicator-mapping.dto';
import {
  BilateralHandlerContext,
  BilateralIndicatorTypeHandler,
} from './bilateral-indicator-type-handler.interface';

@Injectable()
export class PolicyChangeBilateralIndicatorTypeHandler
  implements BilateralIndicatorTypeHandler
{
  readonly indicatorType = 'policy_change';

  constructor(
    private readonly policyChangeService: ResultPolicyChangeService,
  ) {}

  validate(dto: ContributionDto): void {
    this.requireFields(dto, [
      'policy_type_id',
      'policy_stage_id',
      'implementing_organizations',
    ]);

    if (!Array.isArray(dto.implementing_organizations)) {
      throw new BadRequestException(
        'implementing_organizations must be an array',
      );
    }
  }

  async upsert(
    ctx: BilateralHandlerContext,
    dto: ContributionDto,
  ): Promise<{ fkField: string; fkId: number }> {
    this.validate(dto);
    await this.ensureResultTypeRow(ctx);
    await this.policyChangeService.update(ctx.resultId, {
      policy_type_id: Number(dto.policy_type_id),
      policy_stage_id: Number(dto.policy_stage_id),
      implementing_organization: dto.implementing_organizations as any[],
    } as any);

    return { fkField: 'result_policy_change_id', fkId: ctx.resultId };
  }

  async delete(ctx: BilateralHandlerContext): Promise<void> {
    await ctx.manager?.getRepository(ResultPolicyChange).update(ctx.resultId, {
      is_active: false,
      deleted_at: new Date(),
    });
  }

  private async ensureResultTypeRow(
    ctx: BilateralHandlerContext,
  ): Promise<void> {
    try {
      await this.policyChangeService.create(ctx.resultId, ctx.manager);
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
