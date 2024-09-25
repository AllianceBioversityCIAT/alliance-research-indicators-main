import { Controller } from '@nestjs/common';
import { IndicatorTypesService } from './indicator-types.service';

@Controller('indicator-types')
export class IndicatorTypesController {
  constructor(private readonly indicatorTypesService: IndicatorTypesService) {}
}
