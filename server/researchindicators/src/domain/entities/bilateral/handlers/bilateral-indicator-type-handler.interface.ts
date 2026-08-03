import { EntityManager } from 'typeorm';
import { ContributionDto } from '../dto/upsert-indicator-mapping.dto';

export interface BilateralHandlerContext {
  resultId: number;
  resultCode: string;
  indicatorCode: string;
  manager?: EntityManager;
}

export interface BilateralIndicatorTypeHandler {
  readonly indicatorType: string;
  validate(dto: ContributionDto): void;
  upsert(
    ctx: BilateralHandlerContext,
    dto: ContributionDto,
  ): Promise<{ fkField: string; fkId: number }>;
  delete(ctx: BilateralHandlerContext): Promise<void>;
}
