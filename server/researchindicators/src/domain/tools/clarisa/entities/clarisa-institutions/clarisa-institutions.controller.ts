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
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInstitutionsController {
  constructor(
    private readonly clarisaInstitutionsService: ClarisaInstitutionsService,
  ) {}

  @ApiQuery({
    name: 'only-hq',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    default: TrueFalseEnum.FALSE,
    description: 'Only headquarters',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    default: TrueFalseEnum.FALSE,
    description: 'Have type',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    enum: TrueFalseEnum,
    default: TrueFalseEnum.FALSE,
    description: 'Have location',
  })
  @Get()
  async findLocations(
    @Query('only-hq', new DefaultValuePipe(TrueFalseEnum.FALSE))
    onlyHeadquarters: string,
    @Query('type', new DefaultValuePipe(TrueFalseEnum.FALSE))
    haveType: string,
    @Query('location', new DefaultValuePipe(TrueFalseEnum.FALSE))
    haveLocation: string,
  ) {
    return this.clarisaInstitutionsService
      .getInstitutionsByCountry(haveLocation, onlyHeadquarters, haveType)
      .then((institutions) =>
        ResponseUtils.format({
          description: 'Institutions found',
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
