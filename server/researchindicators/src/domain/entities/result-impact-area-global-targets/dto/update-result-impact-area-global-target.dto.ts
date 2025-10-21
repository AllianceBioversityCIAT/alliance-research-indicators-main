import { PartialType } from '@nestjs/swagger';
import { CreateResultImpactAreaGlobalTargetDto } from './create-result-impact-area-global-target.dto';

export class UpdateResultImpactAreaGlobalTargetDto extends PartialType(
  CreateResultImpactAreaGlobalTargetDto,
) {}
