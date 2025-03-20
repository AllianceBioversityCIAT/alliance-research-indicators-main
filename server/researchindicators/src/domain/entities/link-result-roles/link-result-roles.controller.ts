import { Controller } from '@nestjs/common';
import { LinkResultRolesService } from './link-result-roles.service';

@Controller('link-result-roles')
export class LinkResultRolesController {
  constructor(
    private readonly linkResultRolesService: LinkResultRolesService,
  ) {}
}
