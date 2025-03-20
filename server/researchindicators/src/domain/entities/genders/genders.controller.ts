import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { GendersService } from './genders.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Genders')
@ApiBearerAuth()
@Controller()
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}

  @ApiOperation({ summary: 'Get all genders' })
  @Get()
  async fingAll() {
    return this.gendersService.findAll().then((res) =>
      ResponseUtils.format({
        description: 'Genders found',
        status: HttpStatus.OK,
        data: res,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a gender by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gendersService.findOne(+id).then((res) =>
      ResponseUtils.format({
        description: 'Gender found',
        status: HttpStatus.OK,
        data: res,
      }),
    );
  }
}
