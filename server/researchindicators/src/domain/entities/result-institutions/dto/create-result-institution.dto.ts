import { ApiProperty } from '@nestjs/swagger';
import { ResultInstitution } from '../entities/result-institution.entity';
import { ResultInstitutionAi } from '../entities/result-institution-ai.entity';

export class CreateResultInstitutionDto {
  @ApiProperty({
    type: ResultInstitution,
    required: true,
    description: 'Is a reference to the result id',
    isArray: true,
  })
  institutions: ResultInstitution[];

  @ApiProperty({
    type: ResultInstitutionAi,
    required: false,
    description: 'Is a reference to the result id for AI mined partners',
    isArray: true,
  })
  institutions_ai?: ResultInstitutionAi[];

  @ApiProperty({
    type: Boolean,
    required: false,
    description: 'Indicates if partner is not applicable',
  })
  is_partner_not_applicable?: boolean;
}
