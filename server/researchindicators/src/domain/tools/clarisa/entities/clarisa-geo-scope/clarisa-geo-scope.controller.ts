import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaGeoScopeController {
  constructor(
    private readonly clarisaGeoScopeService: ClarisaGeoScopeService,
  ) {}

  @Get()
  async find() {
    return this.clarisaGeoScopeService.findAll().then((geoScopes) =>
      ResponseUtils.format({
        data: geoScopes,
        description: 'Geo scopes found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaGeoScopeService.findOne<number>(+id).then((geoScope) =>
      ResponseUtils.format({
        data: geoScope,
        description: 'Geo scope found',
        status: HttpStatus.OK,
      }),
    );
  }
}
