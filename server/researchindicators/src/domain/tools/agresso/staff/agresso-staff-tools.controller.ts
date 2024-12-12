import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { ResponseUtils } from '../../../shared/utils/response.utils';

@ApiBearerAuth()
@ApiTags('Agresso Connection')
@Controller()
export class AgressoStaffToolsController {
  constructor(
    private readonly agressoStaffToolsService: AgressoStaffToolsService,
  ) {}

  @Get('clone/execute')
  runCloneClarisa() {
    this.agressoStaffToolsService.cloneAllAgressoStaff();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }
}
