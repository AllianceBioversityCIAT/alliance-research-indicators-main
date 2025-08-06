import { Test, TestingModule } from '@nestjs/testing';
import { GroupsItemsService } from './groups_items.service';

describe('GroupsItemsService', () => {
  let service: GroupsItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupsItemsService],
    }).compile();

    service = module.get<GroupsItemsService>(GroupsItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
