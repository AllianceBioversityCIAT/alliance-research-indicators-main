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
  knowledge_sharing_form: ResultInnovationDevKnouldgeSharingDto;
}
