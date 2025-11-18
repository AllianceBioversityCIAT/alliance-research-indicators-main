import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaGlobalTargetsService } from './clarisa-global-targets.service';
import { BaseController } from '../../../../shared/global-dto/base-controller';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaGlobalTargetsController extends BaseController<ClarisaGlobalTargetsService> {
  constructor(service: ClarisaGlobalTargetsService) {
    super(service, 'Clarisa Global Target');
  }

  @Get('impact-area/:impactAreaId(\\d+)')
  async findByImpactArea(@Param('impactAreaId') impactAreaId: number) {
    return this.service
      .findGlobalTargetsByImpactArea(impactAreaId)
      .then((data) =>
        ResponseUtils.format({
          data: data,
          description: 'Clarisa Global Targets fetched successfully',
          status: HttpStatus.OK,
        }),
      );
  }
}
