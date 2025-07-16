import { Controller, Get, Param, HttpStatus } from '@nestjs/common';
import { ExpansionPotentialsService } from './expansion-potentials.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Expansion Potentials')
@ApiBearerAuth()
@Controller()
export class ExpansionPotentialsController {
  constructor(
    private readonly expansionPotentialsService: ExpansionPotentialsService,
  ) {}

  @ApiOperation({ summary: 'Get expansion potential' })
  @Get()
  async findAll() {
    return await this.expansionPotentialsService.findAll().then((degrees) =>
      ResponseUtils.format({
        description: 'Expansion potentials found',
        status: HttpStatus.OK,
        data: degrees,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a expansion potential by id' })
  @Get(':id')
  async findOne(@Param() id: string) {
    return await this.expansionPotentialsService.findOne(+id).then((degree) =>
      ResponseUtils.format({
        description: 'Expansion potential found',
        status: HttpStatus.OK,
        data: degree,
      }),
    );
  }
}
