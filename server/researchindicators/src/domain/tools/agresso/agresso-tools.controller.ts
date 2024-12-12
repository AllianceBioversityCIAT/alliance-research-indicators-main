import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgressoToolsService } from './agresso-tools.service';

@ApiBearerAuth()
@ApiTags('Agresso Connection')
@Controller()
export class AgressoToolsController {
  constructor(private readonly agressoToolsService: AgressoToolsService) {}

  @Get('clone/execute')
  runCloneClarisa() {
    this.agressoToolsService.cloneAllAgressoEntities();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }
}
