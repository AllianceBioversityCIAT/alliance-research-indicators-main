import { PartialType } from '@nestjs/swagger';
import { CreateInstitutionTypeRoleDto } from './create-institution-type-role.dto';

export class UpdateInstitutionTypeRoleDto extends PartialType(
  CreateInstitutionTypeRoleDto,
) {}
