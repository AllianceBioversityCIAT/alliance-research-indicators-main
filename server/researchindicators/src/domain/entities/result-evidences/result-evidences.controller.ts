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
import { ResultEvidencesService } from './result-evidences.service';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  EvidenceRoleEnum,
  QueryEvidenceRoles,
  QueryEvidenceRolesEnum,
} from '../evidence-roles/enums/evidence-role.enum';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';

@ApiTags('Result Evidences')
@UseInterceptors(SetUpInterceptor)
@Controller()
@ApiBearerAuth()
export class ResultEvidencesController {
  constructor(
    private readonly resultEvidencesService: ResultEvidencesService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @ApiOperation({ summary: 'Update result evidences by result ID' })
  @GetResultVersion()
  @UseGuards(ResultStatusGuard)
  @Patch(`by-result-id/${RESULT_CODE}`)
  async updateResultEvidences(@Body() evidences: CreateResultEvidenceDto) {
    return this.resultEvidencesService
      .updateResultEvidences(this._resultsUtil.resultId, evidences)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result evidences updated',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @ApiOperation({ summary: 'Find result evidences by result ID and role ID' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: QueryEvidenceRolesEnum,
  })
  @GetResultVersion()
  @Get(`by-result-id/${RESULT_CODE}`)
  async getEvidences(@Query('role') role: QueryEvidenceRolesEnum) {
    return this.resultEvidencesService
      .find<EvidenceRoleEnum>(
        this._resultsUtil.resultId,
        QueryEvidenceRoles.getFromName(role)?.value,
      )
      .then((result) =>
        ResponseUtils.format({
          description: 'Result evidences found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @ApiOperation({ summary: 'Find principal evidence by result ID' })
  @GetResultVersion()
  @Get(`principal/${RESULT_CODE}`)
  async getPrincipalEvidence() {
    return this.resultEvidencesService
      .findPrincipalEvidence(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Principal evidence found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}
