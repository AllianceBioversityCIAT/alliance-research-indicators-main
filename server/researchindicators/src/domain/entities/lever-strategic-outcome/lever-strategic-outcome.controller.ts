import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { LeverStrategicOutcomeService } from './lever-strategic-outcome.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Lever Strategic Outcome')
@ApiBearerAuth()
@Controller()
export class LeverStrategicOutcomeController extends BaseController<LeverStrategicOutcomeService> {
  constructor(service: LeverStrategicOutcomeService) {
    super(service, 'Lever Strategic Outcome');
  }

  @Get('by-lever/:lever_id')
  @ApiParam({
    name: 'lever_id',
    type: Number,
    description: 'ID of the Lever',
    example: 1,
  })
  async findByLeverId(@Param('lever_id') lever_id: number) {
    return this.service.findByLeverId(lever_id).then((data) =>
      ResponseUtils.format({
        data,
        description: `List of Lever Strategic Outcomes for lever ID ${lever_id}`,
        status: HttpStatus.OK,
      }),
    );
  }
}
