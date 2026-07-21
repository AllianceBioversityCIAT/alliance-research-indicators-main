import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ClarisaLeversRawDto {
  @ApiProperty({
    type: Number,
    description: 'The id of the lever',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    type: String,
    description: 'The short name of the lever',
    example: 'Short Name',
  })
  short_name!: string;

  @ApiProperty({
    type: String,
    description: 'The full name of the lever',
    example: 'Full Name',
    required: false,
  })
  full_name?: string;
}

export class CreateClarisaLeverDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description: 'The portfolio id of the lever',
    example: 1,
  })
  portfolio_id!: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'The other names of the lever',
    example: 'Other Names',
    required: false,
  })
  other_names?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'The full name of the lever',
    example: 'Full Name',
    required: false,
  })
  full_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'The short name of the lever',
    example: 'Short Name',
    required: false,
  })
  short_name?: string;
}
