import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class LeverSdgTargetDto {
  @ApiProperty({
    type: Number,
    description: 'ID of the lever sdg target',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  public id?: number;

  @ApiProperty({
    type: Number,
    description: 'ID of the lever',
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  public lever_id: number;

  @ApiProperty({
    type: Number,
    description: 'ID of the sdg target',
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  public sdg_target_id: number;
}

export class CreateLeverSdgTargetDto {
  @ApiProperty({
    type: LeverSdgTargetDto,
    isArray: true,
    description: 'List of lever sdg targets',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeverSdgTargetDto)
  public leverSdgTargetList: LeverSdgTargetDto[];
}
