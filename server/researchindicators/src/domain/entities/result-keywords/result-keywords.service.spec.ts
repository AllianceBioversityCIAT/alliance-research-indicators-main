import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultKeywordsService } from './result-keywords.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultKeywordsService', () => {
  let service: ResultKeywordsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultKeywordsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              save: jest.fn(),
              metadata: {
                primaryColumns: [{ propertyName: 'result_keyword_id' }],
              },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: { audit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ResultKeywordsService>(ResultKeywordsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 77
  describe('transformData', () => {
    it('should map strings to ResultKeyword objects with trimmed keyword', () => {
      const result = service.transformData(['  AI  ', 'climate', '  water ']);

      expect(result).toEqual([
        { keyword: 'AI' },
        { keyword: 'climate' },
        { keyword: 'water' },
      ]);
    });

    it('should return empty array when input is empty', () => {
      const result = service.transformData([]);

      expect(result).toEqual([]);
    });

    it('should return undefined when input is null/undefined', () => {
      const result = service.transformData(null);

      expect(result).toBeUndefined();
    });
  });

  // [CLAUDE/DONE] 78
  describe('findKeywordsByResultId', () => {
    it('should return active keywords for the given resultId', async () => {
      const mockKeywords = [
        { result_keyword_id: 1, keyword: 'AI', result_id: 10 },
      ];
      mockFind.mockResolvedValue(mockKeywords);

      const result = await service.findKeywordsByResultId(10);

      expect(mockFind).toHaveBeenCalledWith({
        where: { result_id: 10, is_active: true },
      });
      expect(result).toEqual(mockKeywords);
    });

    it('should return empty array when no keywords found', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findKeywordsByResultId(99);

      expect(result).toEqual([]);
    });
  });
});
