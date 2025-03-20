import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaCountriesController {
  constructor(
    private readonly clarisaCountriesService: ClarisaCountriesService,
  ) {}

  @Get()
  async find() {
    return this.clarisaCountriesService.findAll().then((countries) =>
      ResponseUtils.format({
        data: countries,
        description: 'Countries found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaCountriesService.findOne<number>(+id).then((countries) =>
      ResponseUtils.format({
        data: countries,
        description: 'Country found',
        status: HttpStatus.OK,
      }),
    );
  }
}
