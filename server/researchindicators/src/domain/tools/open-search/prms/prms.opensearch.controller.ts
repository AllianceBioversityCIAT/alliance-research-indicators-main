import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../../shared/enum/queries.enum';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
export class PrmsOpenSearchController {
  constructor(private readonly prmsService: PrmsOpenSearchService) {}

  @Get('fetch-prms-data')
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'async',
    required: false,
    type: String,
    enum: TrueFalseEnum,
  })
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT)
  async fetchPrmsData(
    @Query('year') year: string,
    @Query('async', new DefaultValuePipe(TrueFalseEnum.FALSE))
    async: TrueFalseEnum,
  ) {
    if (async == TrueFalseEnum.TRUE) {
      this.prmsService.getData(+year);
      return ResponseUtils.format({
        data: 'Prms data fetched asynchronously',
        description: 'Prms data fetched asynchronously',
        status: HttpStatus.OK,
      });
    }

    return this.prmsService.getData(+year).then((response) => {
      return ResponseUtils.format({
        data: response,
        description: 'Prms data fetched',
        status: HttpStatus.OK,
      });
    });
  }
}
