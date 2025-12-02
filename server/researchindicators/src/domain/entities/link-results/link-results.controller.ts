import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { LinkResultsService } from './link-results.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { CreateLinkResultDto } from './dto/create-link-result.dto';
import { ServiceResponseDto } from '../../shared/global-dto/service-response.dto';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class LinkResultsController {
  constructor(
    private readonly linkResultsService: LinkResultsService,
    private readonly _resultUtil: ResultsUtil,
  ) {}

  @Get(`details/${RESULT_CODE}`)
  @GetResultVersion()
  async getLinkResultsDetails(): Promise<
    ServiceResponseDto<CreateLinkResultDto>
  > {
    return this.linkResultsService
      .findAndDetails(
        this._resultUtil.resultId,
        LinkResultRolesEnum.LINK_RESULT_SECTION,
      )
      .then((linkResults) =>
        ResponseUtils.format({
          data: {
            link_results: linkResults,
          },
          description: 'Linked results retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch(`details/${RESULT_CODE}`)
  @ApiBody({ type: CreateLinkResultDto })
  @GetResultVersion()
  async patchLinkResultsDetails(@Body() body: CreateLinkResultDto) {
    return this.linkResultsService
      .saveLinkResults(
        this._resultUtil.resultId,
        body,
        [IndicatorsEnum.OICR],
        LinkResultRolesEnum.LINK_RESULT_SECTION,
      )
      .then((existingLinkResults) =>
        ResponseUtils.format({
          data: existingLinkResults,
          description: 'Linked results updated successfully',
          status: HttpStatus.OK,
        }),
      );
  }
}
