import { Module } from '@nestjs/common';
import { GroupsItemsService } from './groups_items.service';
import { GroupsItemsController } from './groups_items.controller';

@Module({
  controllers: [GroupsItemsController],
  providers: [GroupsItemsService],
})
export class GroupsItemsModule {}
