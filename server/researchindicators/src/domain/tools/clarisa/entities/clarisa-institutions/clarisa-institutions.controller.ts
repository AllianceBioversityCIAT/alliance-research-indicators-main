import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { DataReturnEnum } from '../../../../shared/enum/queries.enum';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInstitutionsController {
  constructor(
    private readonly clarisaInstitutionsService: ClarisaInstitutionsService,
  ) {}

  @Get()
  async find() {
    return this.clarisaInstitutionsService
      .findAll({
        institution_type: true,
      })
      .then((institutions) =>
        ResponseUtils.format({
          description: 'Institutions found',
          data: institutions,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiQuery({
    name: 'only-headquarters',
    required: false,
    type: String,
    enum: DataReturnEnum,
    default: DataReturnEnum.FALSE,
    description: 'Only headquarters',
  })
  @Get('locations')
  async findLocations(
    @Query('only-headquarters', new DefaultValuePipe('false'))
    onlyHeadquarters: string,
  ) {
    return this.clarisaInstitutionsService
      .getInstitutionsByCountry(onlyHeadquarters)
      .then((institutions) =>
        ResponseUtils.format({
          description: 'Locations found',
          data: institutions,
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(':id(\\d+)')
  async findById(@Param('id') id: string) {
    return this.clarisaInstitutionsService
      .findOne<number>(+id)
      .then((institutions) =>
        ResponseUtils.format({
          description: 'Institution found',
          data: institutions,
          status: HttpStatus.OK,
        }),
      );
  }
}
