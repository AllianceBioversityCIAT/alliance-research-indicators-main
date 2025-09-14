import { ApiProperty } from '@nestjs/swagger';
import { UpdateResultCapacitySharingDto } from '../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultPolicyChangeDto } from '../../result-policy-change/dto/create-result-policy-change.dto';
import { CreateResultDto } from './create-result.dto';
import { SaveGeoLocationDto } from './save-geo-location.dto';
import { UpdateGeneralInformation } from './update-general-information.dto';
import { CreateResultInnovationDevDto } from '../../result-innovation-dev/dto/create-result-innovation-dev.dto';
import { CreateResultInstitutionDto } from '../../result-institutions/dto/create-result-institution.dto';
import { CreateResultEvidenceDto } from '../../result-evidences/dto/create-result-evidence.dto';

export class ResultAiDto {
  result: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  geoScope: SaveGeoLocationDto;
  capSharing?: UpdateResultCapacitySharingDto;
  policyChange?: CreateResultPolicyChangeDto;
  innovationDev?: CreateResultInnovationDevDto;
  partners?: CreateResultInstitutionDto;
  evidences?: CreateResultEvidenceDto;
}

export class RootAi {
  results: ResultRawAi[];
}

export class CountryAreas {
  @ApiProperty({
    type: String,
    description: 'ISO code of the country',
    example: 'COL',
  })
  country_code: string;

  @ApiProperty({
    type: [String],
    description: 'List of specific areas within the country',
  })
  areas: string[];
}

export class ResultInnovationActorDetailedDto {
  @ApiProperty({
    type: String,
    description: 'Name of the actor',
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Type of the actor (e.g., individual, organization)',
  })
  type: string;

  @ApiProperty({
    type: String,
    description: 'Other actor type if applicable',
    required: false,
  })
  other_actor_type?: string;

  @ApiProperty({
    type: String,
    description: 'Gender of the actor',
  })
  gender: string;

  @ApiProperty({
    type: String,
    description: 'Age group of the actor',
  })
  age_group: string;
}

export class AiRawInstitution {
  @ApiProperty({
    type: String,
    description: 'Unique identifier for the institution',
  })
  institution_id: string;

  @ApiProperty({
    type: String,
    description: 'Name of the institution',
  })
  institution_name: string;

  @ApiProperty({
    type: String,
    description: 'Similarity score of the institution',
  })
  similarity_score: string;
}

export class AiRawUser {
  @ApiProperty({
    type: String,
    description: 'name of the user',
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'code of the user',
  })
  code: string;

  @ApiProperty({
    type: String,
    description: 'similarity score of the user',
  })
  similarity_score: string;
}

export class AiRawCountry {
  @ApiProperty({
    type: String,
    description: 'ISO code of the country',
    example: 'COL',
  })
  code: string;

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Specific areas within the country',
    example: ['Cundinamarca', 'Antioquia'],
    required: false,
  })
  areas?: string[];
}

export class AiRawEvidence {
  @ApiProperty({
    type: String,
    description: 'Link to the evidence document or resource',
  })
  evidence_link: string;

  @ApiProperty({
    type: String,
    description: 'Description of the evidence',
  })
  evidence_description: string;
}

export class AiRawLanguage {
  @ApiProperty({
    type: String,
    description: 'Name of the language',
  })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Code of the language',
  })
  code: string;
}

export class ResultRawAi {
  @ApiProperty({
    type: String,
    description: 'The unique identifier for the contract code',
  })
  contract_code: string;

  @ApiProperty({
    type: Number,
    description: 'The year of the result',
  })
  year: number;

  @ApiProperty({
    type: String,
    description: 'The indicator type of the result',
  })
  indicator: string;

  @ApiProperty({
    type: String,
    description: 'The title of the result',
  })
  title: string;

  @ApiProperty({
    type: String,
    description: 'Detailed description of the result',
  })
  description: string;

  @ApiProperty({
    type: [String],
    description: 'Keywords associated with the result',
  })
  keywords: string[];

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'SDG targets related to the result',
  })
  sdg_targets?: string[];

  @ApiProperty({
    type: String,
  })
  geoscope_level?: string;

  @ApiProperty({
    type: AiRawCountry,
    isArray: true,
    description: 'Countries associated with the result',
    required: false,
  })
  countries: AiRawCountry[];

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Regions associated with the result',
    required: false,
  })
  regions: number[];

  @ApiProperty({
    type: String,
    description: 'Training category if applicable',
    required: false,
  })
  training_category?: string;

  @ApiProperty({
    type: String,
    description: 'Purpose of the training if applicable',
    required: false,
  })
  training_purpose?: string;

  @ApiProperty({
    type: AiRawInstitution,
    isArray: true,
    description: 'Affiliation of the trainees if applicable',
    required: false,
  })
  trainee_affiliation?: AiRawInstitution;

  @ApiProperty({
    type: String,
    description: 'Name of the trainee if applicable',
    required: false,
  })
  trainee_name?: string;

  @ApiProperty({
    type: String,
    description: 'Nationality of the trainee if applicable',
    required: false,
  })
  trainee_nationality?: string;

  @ApiProperty({
    type: String,
    description: 'Gender of the trainee if applicable',
    required: false,
  })
  trainee_gender?: string;

  @ApiProperty({
    type: String,
    description: 'Supervisor of the training if applicable',
    required: false,
  })
  training_supervisor?: AiRawUser;

  @ApiProperty({
    type: AiRawLanguage,
    description: 'Language in which the training was conducted',
    required: false,
  })
  language: AiRawLanguage;

  @ApiProperty({
    type: AiRawInstitution,
    isArray: true,
    description: 'parners involved in the result',
    required: false,
  })
  partners?: AiRawInstitution[];

  @ApiProperty({
    type: AiRawEvidence,
    isArray: true,
    description: 'Evidences supporting the result',
    required: false,
  })
  evidences: AiRawEvidence[];

  @ApiProperty({
    type: String,
    description: 'Type of training conducted',
    required: false,
  })
  training_type: string;

  @ApiProperty({
    type: Number,
    description: 'Total number of participants in the training',
    required: false,
  })
  total_participants: number;

  @ApiProperty({
    type: Number,
    description: 'Number of male participants',
    required: false,
  })
  male_participants: number;

  @ApiProperty({
    type: Number,
    description: 'Number of female participants',
    required: false,
  })
  female_participants: number;

  @ApiProperty({
    type: Number,
    description: 'Number of non-binary participants',
    required: false,
  })
  non_binary_participants: number;

  @ApiProperty({
    type: String,
    description: 'Training modality (online, in-person, hybrid)',
    required: false,
  })
  delivery_modality: string;

  @ApiProperty({
    type: String,
    description: 'Start date of the activity or training',
    format: 'date',
    required: false,
  })
  start_date: string;

  @ApiProperty({
    type: String,
    description: 'End date of the activity or training',
    format: 'date',
    required: false,
  })
  end_date: string;

  @ApiProperty({
    type: String,
    description: 'Duration of the training',
    required: false,
  })
  length_of_training: string;

  @ApiProperty({
    type: String,
    description: 'First name of the Alliance main contact person',
    required: false,
  })
  alliance_main_contact_person_first_name: string;

  @ApiProperty({
    type: String,
    description: 'Last name of the Alliance main contact person',
    required: false,
  })
  alliance_main_contact_person_last_name: string;

  @ApiProperty({
    type: String,
    description: 'Evidence supporting the policy change stage',
    required: false,
  })
  evidence_for_stage: string;

  @ApiProperty({
    type: String,
    description: 'Type of policy being addressed',
    required: false,
  })
  policy_type: string;

  @ApiProperty({
    type: String,
    description: 'Current stage in the policy process',
    required: false,
  })
  stage_in_policy_process: string;

  @ApiProperty({
    type: String,
    description: 'Degree of policy change achieved',
    required: false,
  })
  degree: string;

  @ApiProperty({
    type: String,
    description: 'Short title of the innovation dev',
    required: false,
  })
  short_title: string;

  @ApiProperty({
    type: String,
    description: 'Nature of the innovation',
    required: false,
  })
  innovation_nature: string;

  @ApiProperty({
    type: String,
    description: 'Type of the innovation',
    required: false,
  })
  innovation_type: string;

  @ApiProperty({
    type: Number,
    description: 'Readiness assessment score',
    required: false,
  })
  assess_readiness: number;

  @ApiProperty({
    type: String,
    description: 'Anticipated users of the innovation',
    required: false,
  })
  anticipated_users: string;

  @ApiProperty({
    type: ResultInnovationActorDetailedDto,
    isArray: true,
    description: 'Detailed information about the innovation actors',
    required: false,
  })
  innovation_actors_detailed: ResultInnovationActorDetailedDto[];

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Organizations involved in the result',
    required: false,
  })
  organizations: string[];

  @ApiProperty({
    type: [String],
    description: 'Organization type of the result',
    required: false,
  })
  organization_type: string[];

  @ApiProperty({
    type: [String],
    description: 'Sub-type of the organization if applicable',
    required: false,
  })
  organization_sub_type: string[];

  @ApiProperty({
    type: [String],
    description: 'Other organization type if applicable',
    required: false,
  })
  other_organization_type: string[];
}
