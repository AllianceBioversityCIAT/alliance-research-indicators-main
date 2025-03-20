import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaRegionsController {
  constructor(private readonly clarisaRegionsService: ClarisaRegionsService) {}

  @Get()
  async find() {
    return this.clarisaRegionsService.findAll().then((regions) =>
      ResponseUtils.format({
        description: 'Regions found',
        data: regions,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaRegionsService.findOne<number>(+id).then((region) =>
      ResponseUtils.format({
        description: 'Region found',
        data: region,
        status: HttpStatus.OK,
      }),
    );
  }
}
