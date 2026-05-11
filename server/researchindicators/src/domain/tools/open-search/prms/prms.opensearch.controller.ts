import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
export class PrmsOpenSearchController {
  constructor(private readonly prmsService: PrmsOpenSearchService) { }

  @Get('fetch-prms-data')
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
  })
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT)
  async fetchPrmsData(@Query('year') year: string) {
    return this.prmsService.getData(+year);
  }
}
