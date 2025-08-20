import { SaveGeoLocationDto } from '../../results/dto/save-geo-location.dto';
import { StepOneOicrDto } from './step-one-oicr.dto';
import { StepTwoOicrDto } from './step-two-oicr.dto';

export type CreateStepsOicrDto = SaveGeoLocationDto &
  StepOneOicrDto &
  StepTwoOicrDto & {
    general_comment?: string;
  };
