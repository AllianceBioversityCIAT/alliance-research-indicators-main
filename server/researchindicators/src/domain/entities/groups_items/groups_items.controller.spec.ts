import { Test, TestingModule } from '@nestjs/testing';
import { GroupsItemsController } from './groups_items.controller';
import { GroupsItemsService } from './groups_items.service';

describe('GroupsItemsController', () => {
  let controller: GroupsItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsItemsController],
      providers: [GroupsItemsService],
    }).compile();

    controller = module.get<GroupsItemsController>(GroupsItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
