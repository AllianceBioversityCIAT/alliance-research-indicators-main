import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaLeversService } from './clarisa-levers.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaLeversController {
  constructor(private readonly clarisaLeversService: ClarisaLeversService) {}

  @Get()
  async find() {
    return this.clarisaLeversService.findAll().then((levers) =>
      ResponseUtils.format({
        description: 'Levers found',
        data: this.clarisaLeversService.iconMapper(levers),
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaLeversService.findOne<number>(+id).then((levers) =>
      ResponseUtils.format({
        description: 'Levers found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }
}
