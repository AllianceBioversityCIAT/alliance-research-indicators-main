import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResultUsersService } from './result-users.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { SaveAuthorContcatDto } from './dto/save-author-contact.dto';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';

@ApiTags('Result Users')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ResultUsersController {
  constructor(
    private readonly resultUsersService: ResultUsersService,
    private readonly _resultUtil: ResultsUtil,
    private readonly _currentUserUtil: CurrentUserUtil,
  ) {}

  @Get(`author-contact/by-result/${RESULT_CODE}`)
  @GetResultVersion()
  async findAuthorContactUserByResultId() {
    return this.resultUsersService
      .findAuthorContactUserByResultId(this._resultUtil.resultId)
      .then((res) =>
        ResponseUtils.format({
          data: res,
          description: 'Author contact user retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Post(`author-contact/save-by-result/${RESULT_CODE}`)
  @ApiBody({ type: SaveAuthorContcatDto })
  @GetResultVersion()
  async saveAuthorContactUserByResultId(@Body() data: SaveAuthorContcatDto) {
    return this.resultUsersService
      .saveAuthorContactUserByResultId(this._resultUtil.resultId, data)
      .then((res) =>
        ResponseUtils.format({
          data: res,
          description: 'Author contact user saved successfully',
          status: HttpStatus.CREATED,
        }),
      );
  }

  @Delete(`author-contact/:resultUserId/by-result/${RESULT_CODE}`)
  @ApiParam({ name: 'resultUserId', type: Number })
  @GetResultVersion()
  @ApiOperation({
    summary: 'Delete author/contact user by result id',
    description:
      'Rejects with 409 Conflict when the target result is synced from an ' +
      'external platform (TIP/PRMS/AICCRA) — author/contact assignments are ' +
      'only editable for STAR-origin results.',
  })
  async deleteAuthorContactUserByResultId(
    @Param('resultUserId') resultUserId: number,
  ) {
    this.assertStarSourceEditable(this._resultUtil.platformCode);

    return this.resultUsersService
      .deleteAuthorContactByResultIdAndKey(
        this._resultUtil.resultId,
        resultUserId,
      )
      .then((res) =>
        ResponseUtils.format({
          data: res,
          description: 'Author contact user deleted successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  // NFR-RC-001 (docs/specs/results-center/external-results-readonly-view,
  // T-12) — server-side second layer behind the client-side T-07/T-15 gates
  // (Add/Delete already disabled in the authors/contact table, and
  // onDeleteContactPerson() early-returns for external results). Placed here
  // rather than in ResultUsersService because ResultsUtil already resolves
  // and exposes platform_code for the current request (`_resultUtil` is
  // already injected/used above) — no new query or plumbing needed. A
  // missing/empty platform_code is treated as STAR (matches ResultsUtil's
  // other getters and the client's isExternalResult() convention).
  private assertStarSourceEditable(
    platformCode: string | null | undefined,
  ): void {
    if (platformCode && platformCode !== ReportingPlatformEnum.STAR) {
      throw new ConflictException(
        'Author and contact person assignments cannot be modified for results synced from an external reporting platform',
      );
    }
  }
}
