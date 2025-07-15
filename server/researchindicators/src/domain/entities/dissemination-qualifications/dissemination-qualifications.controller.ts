import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { DisseminationQualificationsService } from './dissemination-qualifications.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Dissemination Qualifications')
@ApiBearerAuth()
@Controller()
export class DisseminationQualificationsController {
  constructor(
    private readonly disseminationQualificationsService: DisseminationQualificationsService,
  ) {}

  @ApiOperation({ summary: 'Get all dissemination qualifications' })
  @Get()
  async findAll() {
    return await this.disseminationQualificationsService
      .findAll()
      .then((degrees) =>
        ResponseUtils.format({
          description: 'Dissemination qualifications found',
          status: HttpStatus.OK,
          data: degrees,
        }),
      );
  }

  @ApiOperation({ summary: 'Get a dissemination qualification by id' })
  @Get(':id')
  async findOne(@Param() id: string) {
    return await this.disseminationQualificationsService
      .findOne(+id)
      .then((degree) =>
        ResponseUtils.format({
          description: 'Dissemination qualification found',
          status: HttpStatus.OK,
          data: degree,
        }),
      );
  }
}
