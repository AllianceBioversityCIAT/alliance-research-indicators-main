import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInnovationReadinessLevelDto } from './create-clarisa-innovation-readiness-level.dto';

export class UpdateClarisaInnovationReadinessLevelDto extends PartialType(
  CreateClarisaInnovationReadinessLevelDto,
) {}
