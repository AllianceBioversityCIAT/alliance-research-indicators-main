import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateImpactOutcomeDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'The name of the impact outcome',
    example: 'Impact Outcome 1',
  })
  name!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'The description of the impact outcome',
    example: 'Impact Outcome 1 description',
  })
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description: 'The id of the portfolio',
    example: 1,
  })
  portfolio_id!: number;
}
