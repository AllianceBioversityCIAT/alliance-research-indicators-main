import { PartialType } from '@nestjs/swagger';
import { CreateExpansionPotentialDto } from './create-expansion-potential.dto';

export class UpdateExpansionPotentialDto extends PartialType(
  CreateExpansionPotentialDto,
) {}
