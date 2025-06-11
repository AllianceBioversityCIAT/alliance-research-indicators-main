import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInnovationTypeDto } from './create-clarisa-innovation-type.dto';

export class UpdateClarisaInnovationTypeDto extends PartialType(
  CreateClarisaInnovationTypeDto,
) {}
