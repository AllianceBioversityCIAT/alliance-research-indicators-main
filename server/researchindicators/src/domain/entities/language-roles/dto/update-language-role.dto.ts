import { PartialType } from '@nestjs/swagger';
import { CreateLanguageRoleDto } from './create-language-role.dto';

export class UpdateLanguageRoleDto extends PartialType(CreateLanguageRoleDto) {}
