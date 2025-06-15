import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class CreateResultInstitutionTypeDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_institution_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: true })
  institution_type_id!: number;
}
