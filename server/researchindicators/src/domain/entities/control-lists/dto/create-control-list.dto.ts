import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateControlListDto {
  @ApiProperty({
    type: Number,
    description: 'Category id the list belongs to',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  categoryId!: number;

  @ApiProperty({
    type: String,
    description:
      'Immutable system key, pattern ^[a-z0-9_.]{2,100}$. Carries no ' +
      'portfolio segment (design.md D-CTL-2); unique per portfolio',
    example: 'kpi.direction',
    pattern: '^[a-z0-9_.]{2,100}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_.]{2,100}$/, {
    message: 'listKey must match ^[a-z0-9_.]{2,100}$',
  })
  listKey!: string;

  @ApiProperty({
    type: String,
    description: 'List name',
    example: 'Direction',
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
    description: 'Optional list description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Code prefix used by the value code proposal (T-03), e.g. "DIR". ' +
      'Defaults to a value derived from listKey when omitted',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  codePrefix?: string;
}
