import { Controller } from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
@Controller('result-capacity-sharing')
export class ResultCapacitySharingController {
  constructor(
    private readonly resultCapacitySharingService: ResultCapacitySharingService,
  ) {}
}
