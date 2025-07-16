import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaSdgsService } from './clarisa-sdgs.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaSdgsController {
  constructor(private readonly clarisaSdgsService: ClarisaSdgsService) {}

  @Get()
  async find() {
    return this.clarisaSdgsService.findAll().then((regions) =>
      ResponseUtils.format({
        description: 'Regions found',
        data: regions,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaSdgsService.findOne<number>(+id).then((region) =>
      ResponseUtils.format({
        description: 'Region found',
        data: region,
        status: HttpStatus.OK,
      }),
    );
  }
}
