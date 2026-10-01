import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateControlListCategoryDto {
  @ApiProperty({
    type: Number,
    description: 'Portfolio id the category belongs to',
    example: 2,
  })
  @IsInt()
  @IsNotEmpty()
  portfolioId!: number;

  @ApiProperty({
    type: String,
    description: 'Category name, unique per portfolio (case-insensitive)',
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
