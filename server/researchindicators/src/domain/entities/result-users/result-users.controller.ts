import {
  Body,
  Controller,
  Delete,
  Get,
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
  @ApiParam({ name: 'resultId', type: Number })
  async findAuthorContactUserByResultId(@Param('resultId') resultId: number) {
    return this.resultUsersService.findAuthorContactUserByResultId(resultId);
  }

  @Post(`author-contact/save-by-result/${RESULT_CODE}`)
  @ApiParam({ name: 'resultId', type: Number })
  @ApiBody({ type: SaveAuthorContcatDto })
  async saveAuthorContactUserByResultId(@Body() data: SaveAuthorContcatDto) {
    return this.resultUsersService.saveAuthorContactUserByResultId(
      this._resultUtil.resultId,
      data,
    );
  }

  @Delete('author-contact/:resultUserId/by-result/:resultId')
  @ApiParam({ name: 'resultUserId', type: Number })
  @ApiParam({ name: 'resultId', type: Number })
  async deleteAuthorContactUserByResultId(
    @Param('resultUserId') resultUserId: number,
    @Param('resultId') resultId: number,
  ) {
    return this.resultUsersService.deleteAuthorContactByResultIdAndKey(
      resultId,
      resultUserId,
    );
  }
}
