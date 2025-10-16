import { Controller } from '@nestjs/common';
import { ResultQuantificationsService } from './result-quantifications.service';

@Controller('result-quantifications')
export class ResultQuantificationsController {
  constructor(
    private readonly resultQuantificationsService: ResultQuantificationsService,
  ) {}
}
