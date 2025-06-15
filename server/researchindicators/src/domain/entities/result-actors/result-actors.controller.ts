import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultActorsService } from './result-actors.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';

@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ResultActorsController {
  constructor(
    private readonly resultActorsService: ResultActorsService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}
}
