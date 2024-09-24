import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInstitutionTypeDto } from './create-clarisa-institution-type.dto';

export class UpdateClarisaInstitutionTypeDto extends PartialType(
  CreateClarisaInstitutionTypeDto,
) {}
