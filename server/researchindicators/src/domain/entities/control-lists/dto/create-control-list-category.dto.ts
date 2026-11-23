import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateControlListCategoryDto {
  @ApiProperty({
    type: String,
    description:
      'Category name, unique across all categories (case-insensitive)',
    example: 'Key Performance Indicators (KPIs)',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional category description',
    example: 'KPI vocabularies used across the strategy period',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
