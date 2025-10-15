import { Controller, Get, HttpStatus } from '@nestjs/common';
import { LeverStrategicOutcomeService } from './lever-strategic-outcome.service';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Lever Strategic Outcome')
@ApiBearerAuth()
@Controller()
export class LeverStrategicOutcomeController extends BaseController<LeverStrategicOutcomeService> {
  constructor(service: LeverStrategicOutcomeService) {
    super(service, 'Lever Strategic Outcome');
  }

  @Get('by-lever/:lever_id')
  async findByLeverId(lever_id: number) {
    return this.service.findByLeverId(lever_id).then((data) =>
      ResponseUtils.format({
        data,
        description: `List of Lever Strategic Outcomes for lever ID ${lever_id}`,
        status: HttpStatus.OK,
      }),
    );
  }
}
