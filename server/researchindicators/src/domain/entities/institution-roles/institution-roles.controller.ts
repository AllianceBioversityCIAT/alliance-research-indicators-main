import { Controller } from '@nestjs/common';
import { InstitutionRolesService } from './institution-roles.service';

@Controller('institution-roles')
export class InstitutionRolesController {
  constructor(
    private readonly institutionRolesService: InstitutionRolesService,
  ) {}
}
