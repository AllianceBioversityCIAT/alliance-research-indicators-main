import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { OpenSearchAllianceStaffApi } from './alliance-staff.opensearch.api';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { Roles } from '../../../shared/decorators/roles.decorator';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class AllianceStaffOpenSearchController {
  constructor(private readonly api: OpenSearchAllianceStaffApi) {}

  @Post('reset')
  @Roles(SecRolesEnum.DEVELOPER)
  async resetOpenSearch() {
    return this.api.resetElasticData().then((response) =>
      ResponseUtils.format({
        description: 'Elastic data reset',
        status: HttpStatus.OK,
        data: response,
      }),
    );
  }

  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('sample-size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.api
      .search(
        query,
        {
          carnet: true,
          first_name: true,
          last_name: true,
          email: true,
        },
        [
          {
            carnet: { order: 'asc' },
          },
        ],
        size,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Results found',
          data: response,
          status: HttpStatus.OK,
        }),
      );
  }
}
