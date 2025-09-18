import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectIndicatorDto } from './create-project_indicator.dto';

export class UpdateProjectIndicatorDto extends PartialType(
  CreateProjectIndicatorDto,
) {}
