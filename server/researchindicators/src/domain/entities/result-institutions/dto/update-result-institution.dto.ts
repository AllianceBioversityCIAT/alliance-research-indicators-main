import { PartialType } from '@nestjs/swagger';
import { CreateResultInstitutionDto } from './create-result-institution.dto';

export class UpdateResultInstitutionDto extends PartialType(CreateResultInstitutionDto) {}
