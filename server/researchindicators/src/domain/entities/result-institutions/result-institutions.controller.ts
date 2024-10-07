import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ResultInstitutionsService } from './result-institutions.service';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  QueryInstitutionsRoles,
  QueryInstitutionsRolesEnum,
} from '../institution-roles/enums/institution-roles.enum';

@ApiTags('Result Institutions')
@Controller()
export class ResultInstitutionsController {
  constructor(
    private readonly resultInstitutionsService: ResultInstitutionsService,
  ) {}

  @Patch('partners/by-result-id/:resultId')
  async updateResultInstitutions(
    @Param('resultId') resultId: string,
    @Body() institutions: CreateResultInstitutionDto,
  ) {
    return this.resultInstitutionsService
      .updatePartners(+resultId, institutions)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result institutions updated',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @ApiQuery({
    enum: QueryInstitutionsRolesEnum,
    name: 'role',
    required: false,
  })
  @ApiParam({
    name: 'resultId',
  })
  @Get('by-result-id/:resultId')
  async getInstitutions(
    @Param('resultId') resultId: string,
    @Query('role') role: QueryInstitutionsRolesEnum,
  ) {
    return this.resultInstitutionsService
      .findAll(+resultId, QueryInstitutionsRoles.getFromName(role)?.value)
      .then((result) =>
        ResponseUtils.format({
          description: `Result institutions by role ${role} found`,
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}
