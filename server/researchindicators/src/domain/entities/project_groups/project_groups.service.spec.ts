import { Test, TestingModule } from '@nestjs/testing';
import { ProjectGroupsService } from './project_groups.service';

describe('ProjectGroupsService', () => {
  let service: ProjectGroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectGroupsService],
    }).compile();

    service = module.get<ProjectGroupsService>(ProjectGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
