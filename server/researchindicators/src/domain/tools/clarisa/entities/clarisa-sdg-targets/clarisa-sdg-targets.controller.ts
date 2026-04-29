import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaSdgTargetsController {
  constructor(private readonly sdgTargetsService: ClarisaSdgTargetsService) {}

  @Get()
  async findAll() {
    return this.sdgTargetsService.findAll().then((data) =>
      ResponseUtils.format({
        data: data,
        description: 'SDG Targets found',
        status: HttpStatus.OK,
      }),
    );
  }
}
