import { Controller, Get, HttpStatus } from '@nestjs/common';
import { IndicatorTypesService } from './indicator-types.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Indicator Types')
@Controller()
@ApiBearerAuth()
export class IndicatorTypesController {
  constructor(private readonly indicatorTypesService: IndicatorTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all indicator types' })
  async findAll() {
    return this.indicatorTypesService.findAll().then((indicatorTypes) =>
      ResponseUtils.format({
        data: indicatorTypes,
        description: 'Indicator types found',
        status: HttpStatus.OK,
      }),
    );
  }
}
