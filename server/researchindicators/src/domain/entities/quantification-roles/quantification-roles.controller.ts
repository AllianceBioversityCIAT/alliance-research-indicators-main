import { Controller } from '@nestjs/common';
import { QuantificationRolesService } from './quantification-roles.service';

@Controller('quantification-roles')
export class QuantificationRolesController {
  constructor(
    private readonly quantificationRolesService: QuantificationRolesService,
  ) {}
}
