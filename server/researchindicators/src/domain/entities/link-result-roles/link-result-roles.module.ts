import { Module } from '@nestjs/common';
import { LinkResultRolesService } from './link-result-roles.service';
import { LinkResultRolesController } from './link-result-roles.controller';

@Module({
  controllers: [LinkResultRolesController],
  providers: [LinkResultRolesService],
})
export class LinkResultRolesModule {}
