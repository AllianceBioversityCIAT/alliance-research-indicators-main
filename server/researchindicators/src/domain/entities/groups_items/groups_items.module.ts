import { Module } from '@nestjs/common';
import { GroupsItemsService } from './groups_items.service';
import { GroupsItemsController } from './groups_items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';

@Module({
  controllers: [GroupsItemsController],
  providers: [GroupsItemsService],
  exports: [GroupsItemsService, TypeOrmModule],
  imports: [TypeOrmModule.forFeature([GroupItem])],
})
export class GroupsItemsModule {}
