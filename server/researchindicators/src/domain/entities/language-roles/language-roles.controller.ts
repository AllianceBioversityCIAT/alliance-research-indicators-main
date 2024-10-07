import { Controller } from '@nestjs/common';
import { LanguageRolesService } from './language-roles.service';

@Controller('language-roles')
export class LanguageRolesController {
  constructor(private readonly languageRolesService: LanguageRolesService) {}
}
