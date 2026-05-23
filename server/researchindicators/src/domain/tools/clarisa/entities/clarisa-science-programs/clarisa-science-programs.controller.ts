import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ClarisaScienceProgramsService } from './clarisa-science-programs.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaScienceProgramsController {
  constructor(
    private readonly clarisaScienceProgramsService: ClarisaScienceProgramsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List CGIAR Science Programs / Scaling programs / Accelerators',
  })
  async findAll() {
    return this.clarisaScienceProgramsService.findAll().then((data) =>
      ResponseUtils.format({
        data,
        description: 'Science programs found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':code')
  @ApiParam({
    name: 'code',
    description: 'Official SP code (e.g. SP01)',
    type: String,
  })
  async findByCode(@Param('code') code: string) {
    return this.clarisaScienceProgramsService.findByCode(code).then((data) =>
      ResponseUtils.format({
        data,
        description: data ? 'Science program found' : 'Science program not found',
        status: data ? HttpStatus.OK : HttpStatus.NOT_FOUND,
      }),
    );
  }
}
