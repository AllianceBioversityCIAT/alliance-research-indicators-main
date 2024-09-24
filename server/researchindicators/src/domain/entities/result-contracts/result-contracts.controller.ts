import { Controller } from '@nestjs/common';
import { ResultContractsService } from './result-contracts.service';
@Controller('result-contracts')
export class ResultContractsController {
  constructor(
    private readonly resultContractsService: ResultContractsService,
  ) {}
}
