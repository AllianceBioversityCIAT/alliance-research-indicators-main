import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GroupsItemsService } from './groups_items.service';
import { CreateGroupsItemDto } from './dto/create-groups_item.dto';
import { UpdateGroupsItemDto } from './dto/update-groups_item.dto';

@Controller('groups-items')
export class GroupsItemsController {
  constructor(private readonly groupsItemsService: GroupsItemsService) {}

  @Post()
  create(@Body() createGroupsItemDto: CreateGroupsItemDto) {
    return this.groupsItemsService.create(createGroupsItemDto);
  }

  @Get()
  findAll() {
    return this.groupsItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsItemsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupsItemDto: UpdateGroupsItemDto) {
    return this.groupsItemsService.update(+id, updateGroupsItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsItemsService.remove(+id);
  }
}
