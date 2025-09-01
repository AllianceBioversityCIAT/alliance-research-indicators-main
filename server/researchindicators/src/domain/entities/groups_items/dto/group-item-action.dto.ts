import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class StructureDto {
  @IsString()
  @IsNotEmpty()
  agreement_id: string;

  @IsString()
  @IsOptional()
  name_level_1?: string;

  @IsString()
  @IsOptional()
  name_level_2?: string;

  @IsString()
  @IsOptional()
  custom_field_1?: string;

  @IsString()
  @IsOptional()
  custom_field_2?: string;

  @IsString()
  @IsOptional()
  custom_field_3?: string;

  @IsString()
  @IsOptional()
  custom_field_4?: string;

  @IsString()
  @IsOptional()
  custom_field_5?: string;

   @IsString()
  @IsOptional()
  custom_field_6?: string;
  
  @IsString()
  @IsOptional()
  custom_field_7?: string;
  
  @IsString()
  @IsOptional()
  custom_field_8?: string;

  @IsString()
  @IsOptional()
  custom_field_9?: string;
  
  @IsString()
  @IsOptional()
  custom_field_10?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentItemDto)
  structures: ParentItemDto[];
}

export class ChildItemDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;
  
  @IsString()
  @IsOptional()
  custom_field_1?: string;

  @IsString()
  @IsOptional()
  custom_field_2?: string;

  @IsString()
  @IsOptional()
  custom_field_3?: string;

  @IsString()
  @IsOptional()
  custom_field_4?: string;

  @IsString()
  @IsOptional()
  custom_field_5?: string;

   @IsString()
  @IsOptional()
  custom_field_6?: string;
  
  @IsString()
  @IsOptional()
  custom_field_7?: string;
  
  @IsString()
  @IsOptional()
  custom_field_8?: string;

  @IsString()
  @IsOptional()
  custom_field_9?: string;
  
  @IsString()
  @IsOptional()
  custom_field_10?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndicatorDto)
  indicators?: IndicatorDto[];
}

export class ParentItemDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChildItemDto)
  items?: ChildItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndicatorDto)
  indicators?: IndicatorDto[];
}

export class CustomFieldsDto {
  @IsString()
  @IsOptional()
  custom_field_1?: string;

  @IsString()
  @IsOptional()
  custom_field_2?: string;

  @IsString()
  @IsOptional()
  custom_field_3?: string;

  @IsString()
  @IsOptional()
  custom_field_4?: string;

  @IsString()
  @IsOptional()
  custom_field_5?: string;

   @IsString()
  @IsOptional()
  custom_field_6?: string;
  
  @IsString()
  @IsOptional()
  custom_field_7?: string;
  
  @IsString()
  @IsOptional()
  custom_field_8?: string;

  @IsString()
  @IsOptional()
  custom_field_9?: string;
  
  @IsString()
  @IsOptional()
  custom_field_10?: string;
}

export class IndicatorDto {
  @IsNotEmpty()
  @IsNumber()
  id?: number;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  level?: number;

  @IsString()
  @IsOptional()
  number_type: string;

  @IsString()
  @IsOptional()
  number_format: string;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  years: number[];

  @IsString()
  @IsOptional()
  target_unit: string;

  @IsNumber()
  @IsOptional()
  target_value: number;

  @IsNumber()
  @IsOptional()
  base_line: number;

  @IsString()
  @IsOptional()
  type: string;
}
