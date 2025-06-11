import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInnovationReadinessLevelsController {
  constructor(
    private readonly service: ClarisaInnovationReadinessLevelsService,
  ) {}

  @Get()
  async find() {
    return this.service.findAll().then((levers) =>
      ResponseUtils.format({
        description: 'Readiness levels found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findOne<number>(+id).then((levers) =>
      ResponseUtils.format({
        description: 'Readiness level found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }
}
