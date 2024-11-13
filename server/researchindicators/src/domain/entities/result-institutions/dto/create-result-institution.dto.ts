import { ApiProperty } from '@nestjs/swagger';
import { ResultInstitution } from '../entities/result-institution.entity';

export class CreateResultInstitutionDto {
  @ApiProperty({
    type: ResultInstitution,
    required: true,
    description: 'Is a reference to the result id',
    isArray: true,
  })
  institutions: ResultInstitution[];
}
