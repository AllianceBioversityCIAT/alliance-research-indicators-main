import { PartialType } from '@nestjs/swagger';
import { CreateIndicatorTypeDto } from './create-indicator-type.dto';

export class UpdateIndicatorTypeDto extends PartialType(
  CreateIndicatorTypeDto,
) {}
