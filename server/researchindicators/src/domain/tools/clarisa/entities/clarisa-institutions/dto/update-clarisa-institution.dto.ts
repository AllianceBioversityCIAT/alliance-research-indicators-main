import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInstitutionDto } from './create-clarisa-institution.dto';

export class UpdateClarisaInstitutionDto extends PartialType(
  CreateClarisaInstitutionDto,
) {}
