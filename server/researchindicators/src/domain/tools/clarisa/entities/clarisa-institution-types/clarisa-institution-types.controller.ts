import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Clarisa')
@Controller()
@ApiBearerAuth()
export class ClarisaInstitutionTypesController {
  constructor(
    private readonly clarisaInstitutionTypesService: ClarisaInstitutionTypesService,
  ) {}

  @Get()
  async find() {
    return this.clarisaInstitutionTypesService
      .findAll()
      .then((institutionTypes) =>
        ResponseUtils.format({
          data: institutionTypes,
          description: 'Institution types found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(':id(\\d+)')
  async findById(id: string) {
    return this.clarisaInstitutionTypesService
      .findOne<number>(+id)
      .then((institutionType) =>
        ResponseUtils.format({
          data: institutionType,
          description: 'Institution type found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('partner/request')
  async findInstitutionTypeToPartner() {
    return this.clarisaInstitutionTypesService
      .findInstitutionTypeToPartner()
      .then((institutionTypes) =>
        ResponseUtils.format({
          data: institutionTypes,
          description: 'Institution types found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('childless')
  async getChildlessInstitutionTypes() {
    return this.clarisaInstitutionTypesService
      .getChildlessInstitutionTypes()
      .then((institutionTypes) =>
        ResponseUtils.format({
          data: institutionTypes,
          description: 'Institution types found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('depth-level/:depth(\\d+)')
  @ApiParam({
    name: 'depth',
    description: 'Depth level of the institution type',
    type: Number,
  })
  @ApiQuery({
    name: 'code',
    description: 'Code of the institution type',
    type: Number,
    required: false,
  })
  async getInstitutionTypesByDepthLevel(
    @Param('depth') depth: string,
    @Query('code') code: string,
  ) {
    return this.clarisaInstitutionTypesService
      .getInstitutionTypesByDepthLevel(Number(code), Number(depth))
      .then((institutionTypes) =>
        ResponseUtils.format({
          data: institutionTypes,
          description: `Institution types found by depth level ${depth}`,
          status: HttpStatus.OK,
        }),
      );
  }
}
