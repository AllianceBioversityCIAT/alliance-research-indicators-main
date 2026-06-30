import { PartialType } from '@nestjs/swagger';
import { CreateResultImpactOutcomeDto } from './create-result-impact-outcome.dto';

export class UpdateResultImpactOutcomeDto extends PartialType(
  CreateResultImpactOutcomeDto,
) {}
