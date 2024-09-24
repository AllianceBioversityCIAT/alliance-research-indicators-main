import { Controller } from '@nestjs/common';
import { ContractRolesService } from './contract-roles.service';

@Controller('contract-roles')
export class ContractRolesController {
  constructor(private readonly contractRolesService: ContractRolesService) {}
}
