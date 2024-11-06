import { PartialType } from '@nestjs/swagger';
import { CreateLinkResultRoleDto } from './create-link-result-role.dto';

export class UpdateLinkResultRoleDto extends PartialType(
  CreateLinkResultRoleDto,
) {}
