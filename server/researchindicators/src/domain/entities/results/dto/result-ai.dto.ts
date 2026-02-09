import { ApiProperty } from '@nestjs/swagger';
import { UpdateResultCapacitySharingDto } from '../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultPolicyChangeDto } from '../../result-policy-change/dto/create-result-policy-change.dto';
import { CreateResultDto } from './create-result.dto';
import { SaveGeoLocationDto } from './save-geo-location.dto';
import { UpdateGeneralInformation } from './update-general-information.dto';
import { CreateResultInnovationDevDto } from '../../result-innovation-dev/dto/create-result-innovation-dev.dto';
import { CreateResultInstitutionDto } from '../../result-institutions/dto/create-result-institution.dto';
import { CreateResultEvidenceDto } from '../../result-evidences/dto/create-result-evidence.dto';
import { ResultSdg } from '../../result-sdgs/entities/result-sdg.entity';
import {
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateIpRightDto } from '../../result-ip-rights/dto/update-ip-right.dto';

export class ResultAiDto {
  result: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  geoScope: SaveGeoLocationDto;
  capSharing?: UpdateResultCapacitySharingDto;
  policyChange?: CreateResultPolicyChangeDto;
  innovationDev?: CreateResultInnovationDevDto;
  partners?: CreateResultInstitutionDto;
  evidences?: CreateResultEvidenceDto;
  sdgs?: ResultSdg[];
  ipRights?: UpdateIpRightDto;
}

export class CountryAreas {
  @ApiProperty({
    type: String,
    description: 'ISO code of the country',
    example: 'COL',
  })
  @IsString()
  country_code: string;

  @ApiProperty({
    type: [String],
    description: 'List of specific areas within the country',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas: string[];
}

export class ResultInnovationActorDetailedDto {
  @ApiProperty({
    type: String,
    description: 'Name of the actor',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    type: String,
    description: 'Type of the actor (e.g., individual, organization)',
  })
  @IsOptional()
  @IsString()
  type: string;

  @ApiProperty({
    type: String,
    description: 'Other actor type if applicable',
    required: false,
  })
  @IsOptional()
  @IsString()
  other_actor_type?: string;

  @ApiProperty({
    type: String,
    description: 'Gender of the actor',
  })
  @IsString()
  @IsOptional()
  gender: string;

  @ApiProperty({
    type: String,
    description: 'Age group of the actor',
  })
  @IsString()
  @IsOptional()
  age_group: string;

  @ApiProperty({
    type: [String],
    description: 'Combined gender and age group of the actor',
  })
  @IsArray()
  @IsString({ each: true })
  @Matches(/^(Men|Women):\s(Youth|Non-youth)$/, {
    each: true,
    message:
      'Each gender_age must be in format "Men: Youth", "Men: Non-youth", "Women: Youth", or "Women: Non-youth"',
  })
  @IsOptional()
  gender_age: string[];
}

export class AiRawInstitution {
  @ApiProperty({
    type: String,
    description: 'Unique identifier for the institution',
  })
  @IsString()
  @IsOptional()
  institution_id: string;

  @ApiProperty({
    type: String,
    description: 'Name of the institution',
  })
  @IsString()
  @IsNotEmpty()
  institution_name: string;

  @ApiProperty({
    type: String,
    description: 'Similarity score of the institution',
  })
  @IsNumber()
  @IsNotEmpty()
  similarity_score: string;
}

export class AiRawUser {
  @ApiProperty({
    type: String,
    description: 'name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: String,
    description: 'code of the user',
  })
  @IsString()
  @IsOptional()
  code: string;

  @ApiProperty({
    type: String,
    description: 'similarity score of the user',
  })
  @IsNumber()
  @IsNotEmpty()
  similarity_score: string;
}

export class AiRawCountry {
  @ApiProperty({
    type: String,
    description: 'ISO code of the country',
    example: 'COL',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Specific areas within the country',
    example: ['Cundinamarca', 'Antioquia'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas?: string[];
}

export class AiRawEvidence {
  @ApiProperty({
    type: String,
    description: 'Link to the evidence document or resource',
  })
  @IsString()
  @IsNotEmpty()
  evidence_link: string;

  @ApiProperty({
    type: String,
    description: 'Description of the evidence',
  })
  @IsString()
  @IsNotEmpty()
  evidence_description: string;
}

export class AiRawLanguage {
  @ApiProperty({
    type: String,
    description: 'Name of the language',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: String,
    description: 'Code of the language',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResultRawAi {
  @ApiProperty({
    type: String,
    description: 'The unique identifier for the contract code',
  })
  @IsNotEmpty()
  @IsString()
  contract_code: string;

  @ApiProperty({
    type: Number,
    description: 'The year of the result',
  })
  @IsOptional()
  @IsString()
  year: number;

  @ApiProperty({
    type: String,
    description: 'The indicator type of the result',
  })
  @IsNotEmpty()
  @IsString()
  indicator: string;

  @ApiProperty({
    type: String,
    description: 'The title of the result',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    type: String,
    description: 'Detailed description of the result',
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({
    type: [String],
    description: 'Keywords associated with the result',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'SDG targets related to the result',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sdg_targets?: string[];

  @ApiProperty({
    type: String,
  })
  @IsOptional()
  @IsString()
  geoscope_level?: string;

  @ApiProperty({
    type: AiRawCountry,
    isArray: true,
    description: 'Countries associated with the result',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiRawCountry)
  countries: AiRawCountry[];

  @ApiProperty({
    type: Number,
    isArray: true,
    description: 'Regions associated with the result',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  regions: number[];

  @ApiProperty({
    type: String,
    description: 'Training category if applicable',
    required: false,
  })
  @IsOptional()
  @IsString()
  training_category?: string;

  @ApiProperty({
    type: String,
    description: 'Purpose of the training if applicable',
    required: false,
  })
  @IsOptional()
  @IsString()
  training_purpose?: string;

  @ApiProperty({
    type: AiRawInstitution,
    description: 'Affiliation of the trainees if applicable',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiRawInstitution)
  trainee_affiliation?: AiRawInstitution;

  @ApiProperty({
    type: String,
    description: 'Name of the trainee if applicable',
    required: false,
  })
  @IsOptional()
  @IsString()
  trainee_name?: string;

  @ApiProperty({
    type: AiRawCountry,
    description: 'Nationality of the trainee if applicable',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiRawCountry)
  trainee_nationality?: AiRawCountry;

  @ApiProperty({
    type: String,
    description: 'Gender of the trainee if applicable',
    required: false,
  })
  @IsOptional()
  @IsString()
  trainee_gender?: string;

  @ApiProperty({
    type: AiRawUser,
    description: 'Supervisor of the training if applicable',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiRawUser)
  training_supervisor?: AiRawUser;

  @ApiProperty({
    type: AiRawLanguage,
    description: 'Language in which the training was conducted',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiRawLanguage)
  language: AiRawLanguage;

  @ApiProperty({
    type: AiRawInstitution,
    isArray: true,
    description: 'parners involved in the result',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiRawInstitution)
  partners?: AiRawInstitution[];

  @ApiProperty({
    type: AiRawEvidence,
    isArray: true,
    description: 'Evidences supporting the result',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiRawEvidence)
  evidences: AiRawEvidence[];

  @ApiProperty({
    type: String,
    description: 'Type of training conducted',
    required: false,
  })
  @IsOptional()
  @IsString()
  training_type: string;

  @ApiProperty({
    type: Number,
    description: 'Total number of participants in the training',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  total_participants: number;

  @ApiProperty({
    type: Number,
    description: 'Number of male participants',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  male_participants: number;

  @ApiProperty({
    type: Number,
    description: 'Number of female participants',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  female_participants: number;

  @ApiProperty({
    type: Number,
    description: 'Number of non-binary participants',
    required: false,
  })
  @IsOptional()
  non_binary_participants: number;

  @ApiProperty({
    type: String,
    description: 'Training modality (online, in-person, hybrid)',
    required: false,
  })
  @IsOptional()
  @IsString()
  delivery_modality: string;

  @ApiProperty({
    type: String,
    description: 'Start date of the activity or training',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsString()
  start_date: string;

  @ApiProperty({
    type: String,
    description: 'End date of the activity or training',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsString()
  end_date: string;

  @ApiProperty({
    type: String,
    description: 'Duration of the training',
    required: false,
  })
  @IsOptional()
  @IsString()
  length_of_training: string;

  @ApiProperty({
    type: String,
    description: 'First name of the Alliance main contact person',
    required: false,
  })
  @IsOptional()
  @IsString()
  alliance_main_contact_person_first_name: string;

  @ApiProperty({
    type: String,
    description: 'Last name of the Alliance main contact person',
    required: false,
  })
  @IsOptional()
  @IsString()
  alliance_main_contact_person_last_name: string;

  @ApiProperty({
    type: AiRawUser,
    description: 'Main contact person for the Alliance',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiRawUser)
  main_contact_person: AiRawUser;

  @ApiProperty({
    type: String,
    description: 'Evidence supporting the policy change stage',
    required: false,
  })
  @IsOptional()
  @IsString()
  evidence_for_stage: string;

  @ApiProperty({
    type: String,
    description: 'Type of policy being addressed',
    required: false,
  })
  @IsOptional()
  @IsString()
  policy_type: string;

  @ApiProperty({
    type: String,
    description: 'Current stage in the policy process',
    required: false,
  })
  @IsOptional()
  @IsString()
  stage_in_policy_process: string;

  @ApiProperty({
    type: String,
    description: 'Degree of policy change achieved',
    required: false,
  })
  @IsOptional()
  @IsString()
  degree: string;

  @ApiProperty({
    type: String,
    description: 'Short title of the innovation dev',
    required: false,
  })
  @IsOptional()
  @IsString()
  short_title: string;

  @ApiProperty({
    type: String,
    description: 'Nature of the innovation',
    required: false,
  })
  @IsOptional()
  @IsString()
  innovation_nature: string;

  @ApiProperty({
    type: String,
    description: 'Type of the innovation',
    required: false,
  })
  @IsOptional()
  @IsString()
  innovation_type: string;

  @ApiProperty({
    type: Number,
    description: 'Readiness assessment score',
    required: false,
  })
  @IsOptional()
  assess_readiness: number;

  @ApiProperty({
    type: String,
    description: 'Anticipated users of the innovation',
    required: false,
  })
  @IsOptional()
  @IsString()
  anticipated_users: string;

  @ApiProperty({
    type: ResultInnovationActorDetailedDto,
    isArray: true,
    description: 'Detailed information about the innovation actors',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultInnovationActorDetailedDto)
  innovation_actors_detailed: ResultInnovationActorDetailedDto[];

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'Organizations involved in the result',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organizations: string[];

  @ApiProperty({
    type: [String],
    description: 'Organization type of the result',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  organization_type: string[];

  @ApiProperty({
    type: [String],
    description: 'Sub-type of the organization if applicable',
    required: false,
  })
  @IsOptional()
  organization_sub_type: string | string[];

  @ApiProperty({
    type: [String],
    description: 'Other organization type if applicable',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  other_organization_type: string[];

  @IsOptional()
  @IsNumber()
  asset_ip_owner_id: number;

  @IsOptional()
  @IsString()
  asset_ip_owner_description: string;

  @IsOptional()
  @IsString()
  @Matches(/^(Yes|No)$/, {
    message: 'The value must be "Yes" or "No"',
  })
  publicity_restriction: string;

  @IsOptional()
  @IsString()
  publicity_restriction_description: string;

  @IsOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(Yes|No)$/, {
    message: 'The value must be "Yes" or "No"',
  })
  potential_asset: string;
}

export class RootAi {
  @ApiProperty({
    type: ResultRawAi,
    isArray: true,
    description: 'Array of results from AI',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultRawAi)
  results: ResultRawAi[];
}
