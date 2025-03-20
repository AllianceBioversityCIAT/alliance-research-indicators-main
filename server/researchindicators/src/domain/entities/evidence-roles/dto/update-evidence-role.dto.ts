import { PartialType } from '@nestjs/swagger';
import { CreateEvidenceRoleDto } from './create-evidence-role.dto';

export class UpdateEvidenceRoleDto extends PartialType(CreateEvidenceRoleDto) {}
