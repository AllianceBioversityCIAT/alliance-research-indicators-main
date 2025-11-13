import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResultUsersService } from './result-users.service';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { SaveAuthorContcatDto } from './dto/save-author-contact.dto';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { ResponseUtils } from '../../shared/utils/response.utils';

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
  async deleteAuthorContactUserByResultId(
    @Param('resultUserId') resultUserId: number,
  ) {
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
}
