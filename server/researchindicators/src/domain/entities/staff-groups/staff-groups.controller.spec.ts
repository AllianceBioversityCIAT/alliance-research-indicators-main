import { Test, TestingModule } from '@nestjs/testing';
import { StaffGroupsController } from './staff-groups.controller';
import { StaffGroupsService } from './staff-groups.service';

describe('StaffGroupsController', () => {
  let controller: StaffGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffGroupsController],
      providers: [{ provide: StaffGroupsService, useValue: {} }],
    }).compile();
    controller = module.get(StaffGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
