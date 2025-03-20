import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInstitutionLocationDto } from './create-clarisa-institution-location.dto';

export class UpdateClarisaInstitutionLocationDto extends PartialType(
  CreateClarisaInstitutionLocationDto,
) {}
