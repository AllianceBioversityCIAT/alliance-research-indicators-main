import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IssueCategoriesService } from './issue-categories.service';
import { IssueCategory } from './entities/issue-category.entity';

describe('IssueCategoriesService', () => {
  let service: IssueCategoriesService;
  const find = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueCategoriesService,
        {
          provide: getRepositoryToken(IssueCategory),
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get<IssueCategoriesService>(IssueCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('find', () => {
    it('should map active categories to id and name', async () => {
      find.mockResolvedValue([
        { issue_category_id: 1, name: 'Bug' },
        { issue_category_id: 2, name: 'Feature' },
      ]);

      const result = await service.find();

      expect(find).toHaveBeenCalledWith({
        select: ['issue_category_id', 'name'],
        where: { is_active: true },
      });
      expect(result).toEqual([
        { id: 1, name: 'Bug' },
        { id: 2, name: 'Feature' },
      ]);
    });
  });
});
