import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  IsSafeStoredContent,
  IsSafeStoredJson,
} from '../../../shared/validators/is-safe-stored-content.validator';

const CATEGORY_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class UpdateAppConfigDto {
  @ApiProperty({
    type: String,
    description: 'The description of the app config',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10_000)
  @IsSafeStoredContent()
  description?: string;

  @ApiProperty({
    type: String,
    description: 'The value of the app config',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10_000)
  @IsSafeStoredContent()
  simple_value?: string;

  @ApiProperty({
    type: Object,
    description: 'The value of the app config',
  })
  @IsObject()
  @IsOptional()
  @IsSafeStoredJson()
  json_value?: object;

  @ApiProperty({
    type: String,
    description: 'The category of the app config',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(CATEGORY_PATTERN, {
    message:
      'category must contain only letters, numbers, underscores, dots, and hyphens',
  })
  @IsSafeStoredContent()
  category?: string;

  @ApiProperty({
    type: String,
    description: 'The subcategory of the app config',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(CATEGORY_PATTERN, {
    message:
      'subcategory must contain only letters, numbers, underscores, dots, and hyphens',
  })
  @IsSafeStoredContent()
  subcategory?: string;
}
