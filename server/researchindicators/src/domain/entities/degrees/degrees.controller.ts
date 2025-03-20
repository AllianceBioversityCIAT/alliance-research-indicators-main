import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { DegreesService } from './degrees.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Degrees')
@ApiBearerAuth()
@Controller()
export class DegreesController {
  constructor(private readonly degreesService: DegreesService) {}

  @ApiOperation({ summary: 'Get all degrees' })
  @Get()
  async findAll() {
    return await this.degreesService.findAll().then((degrees) =>
      ResponseUtils.format({
        description: 'Degrees found',
        status: HttpStatus.OK,
        data: degrees,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a degree by id' })
  @Get(':id')
  async findOne(@Param() id: string) {
    return await this.degreesService.findOne(+id).then((degree) =>
      ResponseUtils.format({
        description: 'Degree found',
        status: HttpStatus.OK,
        data: degree,
      }),
    );
  }
}
