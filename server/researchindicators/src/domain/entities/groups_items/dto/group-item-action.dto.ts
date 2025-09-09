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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LevelDto)
  levels: LevelDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentItemDto)
  structures: ParentItemDto[];
}

export class LevelDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsNumber()
  level?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  custom_fields: CustomFieldDto[];
}
export class CustomFieldDto {
  @IsNotEmpty()
  @IsInt()
  fieldID: number;

  @IsNotEmpty()
  @IsString()
  field_name: string;
}

export class CustomValueDto {
  @IsNotEmpty()
  @IsInt()
  field: number;

  @IsNotEmpty()
  @IsString()
  field_value: string;
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
  @Type(() => CustomValueDto)
  custom_values?: CustomValueDto[];

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
  @Type(() => CustomValueDto)
  custom_values?: CustomValueDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndicatorDto)
  indicators?: IndicatorDto[];
}

export class IndicatorDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
