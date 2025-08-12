import { Type } from 'class-transformer';
import { IsString, IsArray, IsNotEmpty, IsOptional, IsInt, IsNumber} from 'class-validator';

export class StructureDto {
  @IsArray()
  structures: ParentItemDto[];
}

export class ChildItemDto {
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  indicators?: IndicatorDto[];
}

export class ParentItemDto {
  @IsString()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  code: string;

  @IsArray()
  @IsOptional()
  items?: ChildItemDto[];

  indicators?: IndicatorDto[];
}

export class IndicatorDto {
  @IsOptional()
  @IsString()
  id?: string;

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