import { Module } from '@nestjs/common';
import { ProjectGroupsService } from './project_groups.service';
import { ProjectGroupsController } from './project_groups.controller';
import { GroupsItemsModule } from '../groups_items/groups_items.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectGroup } from './entities/project_group.entity';

@Module({
  controllers: [ProjectGroupsController],
  providers: [ProjectGroupsService],
  exports: [ProjectGroupsService],
  imports: [TypeOrmModule.forFeature([ProjectGroup]), GroupsItemsModule],
})
export class ProjectGroupsModule {}
