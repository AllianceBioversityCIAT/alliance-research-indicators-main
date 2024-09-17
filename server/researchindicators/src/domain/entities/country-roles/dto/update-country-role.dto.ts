import { PartialType } from '@nestjs/swagger';
import { CreateCountryRoleDto } from './create-country-role.dto';

export class UpdateCountryRoleDto extends PartialType(CreateCountryRoleDto) {}
