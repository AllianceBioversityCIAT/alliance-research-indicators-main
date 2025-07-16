import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateResultActorDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_actors_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  actor_type_id!: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  sex_age_disaggregation_not_apply?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  women_youth?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  women_not_youth?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  men_youth?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false })
  men_not_youth?: boolean;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  actor_role_id?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  actor_type_custom_name?: string;
}
