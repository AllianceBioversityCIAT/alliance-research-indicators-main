import { Injectable } from '@nestjs/common';
import { CreateGroupsItemDto } from './dto/create-groups_item.dto';
import { UpdateGroupsItemDto } from './dto/update-groups_item.dto';

@Injectable()
export class GroupsItemsService {
  create(createGroupsItemDto: CreateGroupsItemDto) {
    return 'This action adds a new groupsItem';
  }

  findAll() {
    return `This action returns all groupsItems`;
  }

  findOne(id: number) {
    return `This action returns a #${id} groupsItem`;
  }

  update(id: number, updateGroupsItemDto: UpdateGroupsItemDto) {
    return `This action updates a #${id} groupsItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} groupsItem`;
  }
}
