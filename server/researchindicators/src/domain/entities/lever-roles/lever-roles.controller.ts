import { Controller } from '@nestjs/common';
import { LeverRolesService } from './lever-roles.service';

@Controller('lever-roles')
export class LeverRolesController {
  constructor(private readonly leverRolesService: LeverRolesService) {}
}
