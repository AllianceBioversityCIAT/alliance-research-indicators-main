import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ResultInstitutionsService } from './result-institutions.service';
import { CreateResultInstitutionDto } from './dto/create-result-institution.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  QueryInstitutionsRoles,
  QueryInstitutionsRolesEnum,
} from '../institution-roles/enums/institution-roles.enum';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';

@ApiTags('Result Institutions')
@UseInterceptors(SetUpInterceptor)
@Controller()
@ApiBearerAuth()
export class ResultInstitutionsController {
  constructor(
    private readonly resultInstitutionsService: ResultInstitutionsService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @UseGuards(ResultStatusGuard)
  @GetResultVersion()
  @Patch(`partners/by-result-id/${RESULT_CODE}`)
  async updateResultInstitutions(
    @Body() institutions: CreateResultInstitutionDto,
  ) {
    return this.resultInstitutionsService
      .updatePartners(this._resultsUtil.resultId, institutions)
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
  @GetResultVersion()
  @Get(`by-result-id/${RESULT_CODE}`)
  async getInstitutions(@Query('role') role: QueryInstitutionsRolesEnum) {
    return this.resultInstitutionsService
      .findAll(
        this._resultsUtil.resultId,
        QueryInstitutionsRoles.getFromName(role)?.value,
      )
      .then((result) =>
        ResponseUtils.format({
          description: `Result institutions by role ${role} found`,
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}
