import { PartialType } from '@nestjs/swagger';
import { CreateLeverRoleDto } from './create-lever-role.dto';

export class UpdateLeverRoleDto extends PartialType(CreateLeverRoleDto) {}
