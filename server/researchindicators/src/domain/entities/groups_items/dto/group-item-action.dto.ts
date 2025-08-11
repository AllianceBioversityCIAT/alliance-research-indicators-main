import { Type } from 'class-transformer';
import { IsString, ValidateNested, IsArray, IsNotEmpty, IsOptional } from 'class-validator';

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
}
