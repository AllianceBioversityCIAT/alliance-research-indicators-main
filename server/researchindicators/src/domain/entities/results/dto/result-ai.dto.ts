import { ApiProperty } from '@nestjs/swagger';
import { UpdateResultCapacitySharingDto } from '../../result-capacity-sharing/dto/update-result-capacity-sharing.dto';
import { CreateResultPolicyChangeDto } from '../../result-policy-change/dto/create-result-policy-change.dto';
import { CreateResultDto } from './create-result.dto';
import { SaveGeoLocationDto } from './save-geo-location.dto';
import { UpdateGeneralInformation } from './update-general-information.dto';

export class ResultAiDto {
  result: CreateResultDto;
  generalInformation: UpdateGeneralInformation;
  geoScope: SaveGeoLocationDto;
  capSharing?: UpdateResultCapacitySharingDto;
  policyChange?: CreateResultPolicyChangeDto;
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

export class GeoscopeRawAi {
  @ApiProperty({
    type: String,
    description: 'Geographic level (global, regional, national)',
    example: 'national',
  })
  level: string;

  @ApiProperty({
    isArray: true,
    type: CountryAreas || String,
    description: 'List of countries or areas included in the geographic scope',
    required: false,
  })
  sub_list?: CountryAreas[] | string[];
}

export class ResultRawAi {
  @ApiProperty({
    type: String,
    description: 'The unique identifier for the contract code',
  })
  contract_code: string;

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
    type: GeoscopeRawAi,
    description: 'Geographic scope information of the result',
  })
  geoscope: GeoscopeRawAi;

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
  training_modality: string;

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
}
