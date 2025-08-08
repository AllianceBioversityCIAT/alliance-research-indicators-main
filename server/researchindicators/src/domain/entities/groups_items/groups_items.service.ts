import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupItem } from './entities/groups_item.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GroupsItemsService {
  constructor(
    @InjectRepository(GroupItem)
    private readonly groupItemRepository: Repository<GroupItem>,
  ) {}

  async findAll(projectId?: number): Promise<GroupItem[]> {
    const query = this.groupItemRepository.createQueryBuilder('groupItem')
      .select([
        'groupItem.id as item_id',
        'groupItem.name as item_name',
        'groupItem.description as item_description',
        'group.id AS group_id',
        'group.name AS group_name',
      ])
      .leftJoin('groupItem.group', 'group')
      .where('groupItem.is_active = :isActive', { isActive: true });

    return await query.getRawMany();
  }
}
