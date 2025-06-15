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
}
