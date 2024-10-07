import { PartialType } from '@nestjs/swagger';
import { CreateInstitutionRoleDto } from './create-institution-role.dto';

export class UpdateInstitutionRoleDto extends PartialType(
  CreateInstitutionRoleDto,
) {}
