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

export class IndicatorDto {
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
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  level?: number;

  @IsString()
  @IsNotEmpty()
  number_type: string;

  @IsString()
  @IsNotEmpty()
  number_format: string;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  years: number[];

  @IsString()
  @IsNotEmpty()
  target_unit: string;

  @IsNumber()
  target_value: number;

  @IsNumber()
  base_line: number;
}
