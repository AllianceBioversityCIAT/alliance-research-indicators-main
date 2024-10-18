import { Controller, Get, HttpStatus } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

@Controller()
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get()
  async findAll() {
    return this.indicatorsService.findAll().then((indicators) =>
      ResponseUtils.format({
        data: indicators,
        description: 'Indicators found',
        status: HttpStatus.OK,
      }),
    );
  }
}
