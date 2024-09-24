import { Controller } from '@nestjs/common';
import { EvidenceRolesService } from './evidence-roles.service';
@Controller('evidence-roles')
export class EvidenceRolesController {
  constructor(private readonly evidenceRolesService: EvidenceRolesService) {}
}
