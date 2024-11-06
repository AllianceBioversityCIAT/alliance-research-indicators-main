import { Controller } from '@nestjs/common';
import { PolicyTypesService } from './policy-types.service';

@Controller('policy-types')
export class PolicyTypesController {
  constructor(private readonly policyTypesService: PolicyTypesService) {}
}
