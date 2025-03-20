import { Controller } from '@nestjs/common';
import { PolicyStagesService } from './policy-stages.service';

@Controller('policy-stages')
export class PolicyStagesController {
  constructor(private readonly policyStagesService: PolicyStagesService) {}
}
