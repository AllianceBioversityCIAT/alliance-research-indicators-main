import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateResultActorDto } from '../../result-actors/dto/create-result-actor.dto';
import { CreateResultInstitutionTypeDto } from '../../result-institution-types/dto/create-result-institution-type.dto';
import { LinkResult } from '../../link-results/entities/link-result.entity';

export class ResultInnovationDevKnouldgeSharingDto {
  @ApiProperty({ required: false })
  is_knowledge_sharing?: boolean;

  @ApiProperty({ required: false })
  dissemination_qualification_id?: number;

  @ApiProperty({ required: false })
  tool_useful_context?: string;

  @ApiProperty({ required: false })
  results_achieved_expected?: string;

  @ApiProperty({ required: false })
  tool_function_id?: number;

  @ApiProperty({ required: false })
  is_used_beyond_original_context?: boolean;

  @ApiProperty({ required: false })
  adoption_adaptation_context?: string;

  @ApiProperty({ required: false })
  other_tools?: string;

  @ApiProperty({ required: false })
  other_tools_integration?: string;

  @ApiProperty({ required: false, isArray: true, type: LinkResult })
  link_to_result?: LinkResult[];
}

export class ResultInnovationDevScalingPotentialDto {
  @ApiProperty({ required: false })
  is_cheaper_than_alternatives?: number;

  @ApiProperty({ required: false })
  is_simpler_to_use?: number;

  @ApiProperty({ required: false })
  does_perform_better?: number;

  @ApiProperty({ required: false })
  is_desirable_to_users?: number;

  @ApiProperty({ required: false })
  has_commercial_viability?: number;

  @ApiProperty({ required: false })
  has_suitable_enabling_environment?: number;

  @ApiProperty({ required: false })
  has_evidence_of_uptake?: number;

  @ApiProperty({ required: false })
  expansion_potential_id?: number;

  @ApiProperty({ required: false })
  expansion_adaptation_details?: string;
}

export class CreateResultInnovationDevDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  short_title?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_nature_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_readiness_id?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  no_sex_age_disaggregation?: boolean;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  anticipated_users_id?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  expected_outcome?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  intended_beneficiaries_description?: string;

  @IsArray()
  @IsOptional()
  @ApiProperty({ type: [CreateResultActorDto], required: false })
  actors?: CreateResultActorDto[];

  @IsArray()
  @IsOptional()
  @ApiProperty({ type: [CreateResultInstitutionTypeDto], required: false })
  institution_types?: CreateResultInstitutionTypeDto[];

  @ApiProperty({
    type: ResultInnovationDevKnouldgeSharingDto,
    required: false,
  })
  knowledge_sharing_form?: ResultInnovationDevKnouldgeSharingDto;

  @ApiProperty({
    type: ResultInnovationDevScalingPotentialDto,
    required: false,
  })
  scaling_potential_form?: ResultInnovationDevScalingPotentialDto;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  is_new_or_improved_variety: boolean;

  @ApiProperty({
    required: false,
    type: Number,
  })
  @IsOptional()
  new_or_improved_varieties_count: number;
}
