import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ClarisaService } from './clarisa.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller()
export class ClarisaController {
  constructor(private readonly clarisaService: ClarisaService) {}

  @Get('clone/execute')
  runCloneClarisa() {
    this.clarisaService.cloneAllClarisaEntities();
    return ResponseUtils.format({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  }
}
