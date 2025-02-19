import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { GreenChecksService } from './green-checks.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class GreenChecksController {
  constructor(private readonly greenChecksService: GreenChecksService) {}

  @Get(':resultId(\\d+)')
  findGreenChecksByResultId(@Param('resultId') resultId: string) {
    return this.greenChecksService.findByResultId(+resultId).then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'Green checks found',
        status: HttpStatus.OK,
      }),
    );
  }
}
