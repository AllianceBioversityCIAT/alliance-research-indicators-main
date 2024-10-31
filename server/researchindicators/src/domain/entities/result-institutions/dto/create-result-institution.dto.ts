import { ApiProperty } from '@nestjs/swagger';
import { ResultInstitution } from '../entities/result-institution.entity';

export class CreateResultInstitutionDto {
  @ApiProperty({
    type: Number,
    required: true,
    description: 'Is a reference to the result id',
    isArray: true,
  })
  institutions: number[];
}

export class FindResultInstitutionDto {
  @ApiProperty({
    type: Number,
    required: true,
    description: 'Is a reference to the result id',
    isArray: true,
  })
  institutions: number[];

  @ApiProperty({
    type: ResultInstitution,
    isArray: true,
    required: true,
    description: 'Is a reference to the institution role id',
  })
  metadata_institutions: Partial<ResultInstitution>[];
}
