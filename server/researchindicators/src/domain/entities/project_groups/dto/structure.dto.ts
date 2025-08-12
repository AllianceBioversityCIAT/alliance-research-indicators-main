import { IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StructureItemDto {
  @IsOptional()
  @IsInt()
  id?: number; // Solo para update/delete

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  officialCode: string;

  @IsOptional()
  @IsInt()
  projectId?: number;

  @IsOptional()
  isActive?: boolean;
}

export class SubGroupDto {
  @IsString()
  groupName: string;

  @ValidateNested({ each: true })
  @Type(() => StructureItemDto)
  items: StructureItemDto[];
}

export class StructureDto {
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @IsEnum([1, 2])
  level: 1 | 2;

  // Datos de grupo
  @IsOptional()
  @IsInt()
  groupId?: number; // Para update/delete

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsInt()
  parentGroupId?: number; // Solo para nivel 2

  // Items directos del grupo
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StructureItemDto)
  items?: StructureItemDto[];

  // Subgrupos solo en creación de nivel 1
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SubGroupDto)
  subGroups?: SubGroupDto[];
}