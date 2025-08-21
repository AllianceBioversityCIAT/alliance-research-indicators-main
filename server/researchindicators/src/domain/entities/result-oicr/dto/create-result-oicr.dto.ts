import { ApiProperty } from '@nestjs/swagger/dist/decorators';
import { CreateResultDto } from '../../results/dto/create-result.dto';
import { SaveGeoLocationDto } from '../../results/dto/save-geo-location.dto';
import { StepOneOicrDto } from './step-one-oicr.dto';
import { StepTwoOicrDto } from './step-two-oicr.dto';

export class StepFourOicrDto {
  @ApiProperty({ type: SaveGeoLocationDto })
  general_comment?: string;
}

export class CreateResultOicrDto {
  @ApiProperty({ type: StepOneOicrDto })
  step_one: StepOneOicrDto;
  @ApiProperty({ type: StepTwoOicrDto })
  step_two: StepTwoOicrDto;
  @ApiProperty({ type: SaveGeoLocationDto })
  step_three: SaveGeoLocationDto;
  @ApiProperty({ type: StepFourOicrDto })
  step_four: StepFourOicrDto;
  @ApiProperty({ type: CreateResultDto })
  base_information: CreateResultDto;
}
