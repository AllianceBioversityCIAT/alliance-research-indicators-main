import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupsItemDto } from './create-groups_item.dto';

export class UpdateGroupsItemDto extends PartialType(CreateGroupsItemDto) {}
