import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';
import { ClarisaCountry } from './entities/clarisa-country.entity';
import { FindOptionsWhere, IsNull, Not } from 'typeorm';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaCountriesController {
  constructor(
    private readonly clarisaCountriesService: ClarisaCountriesService,
  ) {}

  @Get()
  @ApiQuery({
    name: 'is-sub-national',
    enum: TrueFalseEnum,
    required: false,
    description: 'Filter by sub-national countries',
  })
  async find(@Query('is-sub-national') isSubNational: TrueFalseEnum) {
    let where: FindOptionsWhere<ClarisaCountry>;
    if (isSubNational == TrueFalseEnum.TRUE) {
      where = {
        clarisa_sub_nationals: {
          code: Not(IsNull()),
        },
      };
    }
    return this.clarisaCountriesService
      .findAll(undefined, where)
      .then((countries) =>
        ResponseUtils.format({
          data: countries,
          description: 'Countries found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaCountriesService.findOne<number>(+id).then((countries) =>
      ResponseUtils.format({
        data: countries,
        description: 'Country found',
        status: HttpStatus.OK,
      }),
    );
  }
}
