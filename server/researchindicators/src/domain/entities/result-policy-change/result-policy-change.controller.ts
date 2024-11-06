import { Controller } from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';

@Controller('result-policy-change')
export class ResultPolicyChangeController {
  constructor(
    private readonly resultPolicyChangeService: ResultPolicyChangeService,
  ) {}
}
