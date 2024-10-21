import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
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

@ApiTags('Result Evidences')
@Controller()
@ApiBearerAuth()
export class ResultEvidencesController {
  constructor(
    private readonly resultEvidencesService: ResultEvidencesService,
  ) {}

  @ApiOperation({ summary: 'Update result evidences by result ID' })
  @Patch('by-result-id/:resultId')
  async updateResultEvidences(
    @Param('resultId') resultId: string,
    @Body() evidences: CreateResultEvidenceDto,
  ) {
    return this.resultEvidencesService
      .updateResultEvidences(+resultId, evidences)
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
  @Get('by-result-id/:resultId')
  async getEvidences(
    @Param('resultId') resultId: string,
    @Query('role') role: QueryEvidenceRolesEnum,
  ) {
    return this.resultEvidencesService
      .find<EvidenceRoleEnum>(
        +resultId,
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
}
