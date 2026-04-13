import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultKnowledgeProductService } from './result-knowledge-product.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultKnowledgeProductService', () => {
  let service: ResultKnowledgeProductService;

  const mockSave = jest.fn();
  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1, created_by: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultKnowledgeProductService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              save: mockSave,
              update: mockUpdate,
              findOne: mockFindOne,
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultKnowledgeProductService>(ResultKnowledgeProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 79
  describe('create', () => {
    it('should save a new ResultKnowledgeProduct with the given resultId', async () => {
      const saved = { result_id: 10, created_by: 1 };
      mockSave.mockResolvedValue(saved);

      const result = await service.create(10);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ result_id: 10 }),
      );
      expect(result).toEqual(saved);
    });
  });

  // [CLAUDE/DONE] 80
  describe('update', () => {
    it('should update fields and return the updated record', async () => {
      const updated = { result_id: 10, open_access: true, citation: 'Cite' };
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockFindOne.mockResolvedValue(updated);

      const data = {
        result_id: 10,
        open_access: true,
        citation: 'Cite',
        publication_date: '2024-01-01',
        type: 'Journal',
      } as any;

      const result = await service.update(10, data);

      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ open_access: true, citation: 'Cite' }),
      );
      expect(mockFindOne).toHaveBeenCalledWith({ where: { result_id: 10 } });
      expect(result).toEqual(updated);
    });
  });

  // [CLAUDE/DONE] 81
  describe('activeKpByResultId', () => {
    it('should update the record to is_active=true', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });

      await service.activeKpByResultId(10);

      expect(mockUpdate).toHaveBeenCalledWith(10, { is_active: true });
    });
  });
});
