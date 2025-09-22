import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Temporary External OICRs')
@ApiBearerAuth()
export class TempExternalOicrsController {
  constructor(private readonly service: TempExternalOicrsService) {}

  @Get()
  async findAll() {
    return this.service.findExternalOicrs().then((res) =>
      ResponseUtils.format({
        data: res,
        description: 'results found correctly',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id/metadata')
  async findMetadata(@Param('id') id: number) {
    const leverList = await this.service.mappingExternalOicrs(id);
    return ResponseUtils.format({
      data: leverList,
      description: 'results found correctly',
      status: HttpStatus.OK,
    });
  }
}
