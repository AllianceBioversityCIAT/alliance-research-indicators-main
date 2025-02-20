import { ApiProperty } from '@nestjs/swagger';
import { ResultInstitution } from '../../result-institutions/entities/result-institution.entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';
import { ResultLanguage } from '../../result-languages/entities/result-language.entity';

export class CapDevIndividualDto {
  @ApiProperty({
    type: Number,
    name: 'session_length_id',
  })
  session_length_id?: number;

  @ApiProperty({
    type: String,
    name: 'trainee_name',
  })
  trainee_name?: string;

  @ApiProperty({
    type: Number,
    name: 'degree_id',
  })
  degree_id?: number;

  @ApiProperty({
    type: Number,
    name: 'gender_id',
  })
  gender_id?: number;

  @ApiProperty({
    type: ResultInstitution,
    name: 'affiliation',
  })
  affiliation?: ResultInstitution;

  @ApiProperty({
    type: ResultCountry,
    name: 'nationality',
  })
  nationality?: ResultCountry;
}

export class CapDevGroupDto {
  @ApiProperty({
    type: Number,
    name: 'session_participants_female',
  })
  session_participants_female: number;

  @ApiProperty({
    type: Number,
    name: 'session_participants_male',
  })
  session_participants_male: number;

  @ApiProperty({
    type: Number,
    name: 'session_participants_non_binary',
  })
  session_participants_non_binary: number;

  @ApiProperty({
    type: Number,
    name: 'session_participants_total',
  })
  session_participants_total: number;

  @ApiProperty({
    type: Number,
    name: 'session_length_id',
  })
  session_purpose_id: number;

  @ApiProperty({
    type: String,
    name: 'session_purpose_description',
  })
  session_purpose_description: string;

  @ApiProperty({
    type: Number,
    name: 'degree_id',
  })
  is_attending_organization: boolean;

  @ApiProperty({
    type: ResultInstitution,
    name: 'trainee_organization_representative',
    isArray: true,
  })
  trainee_organization_representative: ResultInstitution[];
}

export class UpdateResultCapacitySharingDto {
  @ApiProperty({
    type: Number,
    name: 'session_format_id',
  })
  session_format_id?: number;

  @ApiProperty({
    type: Number,
    name: 'session_type_id',
  })
  session_type_id?: number;

  @ApiProperty({
    type: ResultUser,
    name: 'training_supervisor',
  })
  training_supervisor?: ResultUser;

  @ApiProperty({
    type: ResultLanguage,
    name: 'training_supervisor_languages',
  })
  training_supervisor_languages?: ResultLanguage;

  @ApiProperty({
    type: Date,
    name: 'start_date',
  })
  start_date?: Date;

  @ApiProperty({
    type: Date,
    name: 'end_date',
  })
  end_date?: Date;

  @ApiProperty({
    type: String,
    name: 'supervisor_email',
  })
  delivery_modality_id?: number;

  @ApiProperty({
    type: CapDevIndividualDto,
    name: 'individual',
  })
  individual?: CapDevIndividualDto;

  @ApiProperty({
    type: CapDevGroupDto,
    name: 'group',
  })
  group?: CapDevGroupDto;

  created_at?: Date;

  updated_at?: Date;
}
