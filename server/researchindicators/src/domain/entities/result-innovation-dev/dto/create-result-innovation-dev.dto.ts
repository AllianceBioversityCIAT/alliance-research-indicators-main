import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateResultInnovationDevDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  short_title?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_nature_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_readiness_id?: number;
}
