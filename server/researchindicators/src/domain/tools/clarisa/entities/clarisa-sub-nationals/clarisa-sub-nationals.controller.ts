import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaSubNationalsController {
  constructor(
    private readonly clarisaSubNationalsService: ClarisaSubNationalsService,
  ) {}

  @Get()
  async find() {
    return this.clarisaSubNationalsService.findAll().then((subNationals) =>
      ResponseUtils.format({
        description: 'Subnationals found',
        data: subNationals,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaSubNationalsService
      .findOne<number>(+id)
      .then((subNationals) =>
        ResponseUtils.format({
          description: 'Subnationals found',
          data: subNationals,
          status: HttpStatus.OK,
        }),
      );
  }
}
