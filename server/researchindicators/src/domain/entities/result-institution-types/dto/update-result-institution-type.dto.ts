import { PartialType } from '@nestjs/swagger';
import { CreateResultInstitutionTypeDto } from './create-result-institution-type.dto';

export class UpdateResultInstitutionTypeDto extends PartialType(
  CreateResultInstitutionTypeDto,
) {}
