import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class ResponseOicrWordTemplateDto {
  @IsString()
  @IsNotEmpty()
  result_code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  project_id: string;

  @IsString()
  @IsNotEmpty()
  project_title: string;

  @IsOptional()
  @IsNumber()
  tag_id?: number | null;

  @IsOptional()
  @IsString()
  tagging?: string | null;

  @IsOptional()
  @IsString()
  outcome_impact_statement?: string | null;

  @IsOptional()
  @IsNumber()
  lever_id?: number | null;

  @IsOptional()
  @IsString()
  lever?: string | null;

  @IsOptional()
  @IsString()
  lever_name?: string | null;

  @IsOptional()
  @IsString()
  geographic_scope?: string | null;

  @IsOptional()
  @IsString()
  region_code?: string | null;

  @IsOptional()
  @IsString()
  region_name?: string | null;

  @IsOptional()
  @IsString()
  country_code?: string | null;

  @IsOptional()
  @IsString()
  country_name?: string | null;

  @IsOptional()
  @IsString()
  comment_geo_scope?: string | null;
}