import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ToolFunctionsService } from './tool-functions.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Tool Functions')
@ApiBearerAuth()
@Controller()
export class ToolFunctionsController {
  constructor(private readonly toolFunctionsService: ToolFunctionsService) {}

  @ApiOperation({ summary: 'Get all tool functions' })
  @Get()
  async findAll() {
    return await this.toolFunctionsService.findAll().then((degrees) =>
      ResponseUtils.format({
        description: 'Tool functions found',
        status: HttpStatus.OK,
        data: degrees,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a tool function by id' })
  @Get(':id')
  async findOne(@Param() id: string) {
    return await this.toolFunctionsService.findOne(+id).then((degree) =>
      ResponseUtils.format({
        description: 'Tool function found',
        status: HttpStatus.OK,
        data: degree,
      }),
    );
  }
}
