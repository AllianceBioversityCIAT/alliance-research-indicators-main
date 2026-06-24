import { OmitType } from '@nestjs/swagger';
import { Portfolio } from '../entities/portfolio.entity';

export class CreatePortfolioDto extends OmitType(Portfolio, [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'is_active',
  'created_by',
  'updated_by',
]) {}
