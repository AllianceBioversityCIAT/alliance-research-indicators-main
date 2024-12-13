import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Indicators')
@Controller()
@ApiBearerAuth()
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get()
  @ApiOperation({ summary: 'Find all indicators' })
  async findAll() {
    return this.indicatorsService.findAll().then((indicators) =>
      ResponseUtils.format({
        data: indicators,
        description: 'Indicators found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find indicator by id' })
  async findOne(@Param('id') id: number) {
    return this.indicatorsService.findOne(id).then((indicator) =>
      ResponseUtils.format({
        data: indicator,
        description: 'Indicator found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get('results-amount/current-user')
  @ApiOperation({ summary: 'Find all results amount by current user' })
  async findResultsAmountByCurrentUser() {
    return this.indicatorsService
      .findResultsAmountByIndicatorCurrentUser()
      .then((indicators) =>
        ResponseUtils.format({
          data: indicators,
          description: 'Results amount found',
          status: HttpStatus.OK,
        }),
      );
  }
}
