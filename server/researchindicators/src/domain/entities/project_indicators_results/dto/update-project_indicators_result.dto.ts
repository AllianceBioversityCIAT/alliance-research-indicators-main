import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectIndicatorsResultDto } from './create-project_indicators_result.dto';

export class UpdateProjectIndicatorsResultDto extends PartialType(CreateProjectIndicatorsResultDto) {}
