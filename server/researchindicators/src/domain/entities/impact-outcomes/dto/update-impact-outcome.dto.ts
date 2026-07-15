import { PartialType } from '@nestjs/swagger';
import { CreateImpactOutcomeDto } from './create-impact-outcome.dto';

export class UpdateImpactOutcomeDto extends PartialType(
  CreateImpactOutcomeDto,
) {}
