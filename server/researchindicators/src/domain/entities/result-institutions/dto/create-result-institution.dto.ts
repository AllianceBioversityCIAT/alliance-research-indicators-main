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

  @ApiProperty({
    type: Boolean,
    required: false,
    description: 'Indicates if partner is not applicable',
  })
  is_partner_not_applicable?: boolean;
}
