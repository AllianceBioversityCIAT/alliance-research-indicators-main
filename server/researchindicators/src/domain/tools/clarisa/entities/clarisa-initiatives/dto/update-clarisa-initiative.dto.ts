import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInitiativeDto } from './create-clarisa-initiative.dto';

export class UpdateClarisaInitiativeDto extends PartialType(
  CreateClarisaInitiativeDto,
) {}
