import { PartialType, PickType } from '@nestjs/swagger';
import { CreateControlListCategoryDto } from './create-control-list-category.dto';

/**
 * A4: `{name?, description?}`. `portfolioId` is deliberately NOT whitelisted
 * here — categories cannot be moved across portfolios in this slice, and
 * `ValidationPipe({ forbidNonWhitelisted: true })` turns any attempt into a
 * 400 instead of silently reassigning the portfolio.
 */
export class UpdateControlListCategoryDto extends PartialType(
  PickType(CreateControlListCategoryDto, ['name', 'description'] as const),
) {}
