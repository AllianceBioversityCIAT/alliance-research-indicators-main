import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

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

  @Get('metadata/:id')
  @ApiParam({ name: 'id', type: Number, description: 'OICRs ID' })
  async findMetadata(@Param('id', ParseIntPipe) id: number) {
    return this.service.metadata(id).then((res) =>
      ResponseUtils.format({
        data: res,
        description: 'metadata found correctly',
        status: HttpStatus.OK,
      }),
    );
  }
}
