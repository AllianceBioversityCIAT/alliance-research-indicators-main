import { Module } from '@nestjs/common';
import { ProjectGroupsService } from './project_groups.service';
import { ProjectGroupsController } from './project_groups.controller';

@Module({
  controllers: [ProjectGroupsController],
  providers: [ProjectGroupsService],
})
export class ProjectGroupsModule {}
