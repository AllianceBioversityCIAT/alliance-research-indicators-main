import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgressoService } from './agresso.service';

@ApiBearerAuth()
@ApiTags('Agresso')
@Controller()
export class AgressoController {
  constructor(private readonly agressoService: AgressoService) {}

  @Get('clone/execute')
  runCloneClarisa() {
    this.agressoService.cloneAllAgressoEntities();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }
}
