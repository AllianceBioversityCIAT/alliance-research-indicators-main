import { Module } from '@nestjs/common';
import { LanguageRolesService } from './language-roles.service';
import { LanguageRolesController } from './language-roles.controller';

@Module({
  controllers: [LanguageRolesController],
  providers: [LanguageRolesService],
})
export class LanguageRolesModule {}
