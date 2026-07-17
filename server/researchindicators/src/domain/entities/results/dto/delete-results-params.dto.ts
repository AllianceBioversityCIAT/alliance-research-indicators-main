import { ApiProperty } from '@nestjs/swagger';
import { ReportingPlatformEnum } from '../enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class DeleteResultsByParametersDto {
  @ApiProperty({
    description: 'The IDs of the results to delete',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  resultIds?: number[];

  @ApiProperty({
    description: 'The platform code of the results to delete',
    type: String,
    enum: ReportingPlatformEnum,
    example: ReportingPlatformEnum.STAR,
  })
  @IsEnum(ReportingPlatformEnum)
  @IsOptional()
  platformCode: ReportingPlatformEnum;

  @ApiProperty({
    description: 'The status code of the results to delete',
    type: Number,
    example: ResultStatusEnum.APPROVED,
  })
  @IsEnum(ResultStatusEnum)
  @IsOptional()
  statusCode: ResultStatusEnum;

  @ApiProperty({
    description:
      'If true, the results will not be deleted, only the status will be updated',
    type: Boolean,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  testing: boolean;
}
