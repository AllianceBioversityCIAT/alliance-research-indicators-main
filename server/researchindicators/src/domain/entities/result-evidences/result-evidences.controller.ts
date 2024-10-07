import { Body, Controller, HttpStatus, Param, Patch } from '@nestjs/common';
import { ResultEvidencesService } from './result-evidences.service';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Result Evidences')
@Controller()
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
}
