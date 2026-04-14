import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { QueryService } from './query.service';

describe('QueryService', () => {
  let service: QueryService;
  const mockQuery = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: DataSource,
          useValue: { query: mockQuery },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 159
  describe('deleteFullResultById', () => {
    it('should call dataSource.query with the stored procedure and the result id', async () => {
      mockQuery.mockResolvedValue(undefined);

      await service.deleteFullResultById(42);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT full_delete_result_version(?)',
        [42],
      );
    });

    it('should resolve without returning a value', async () => {
      mockQuery.mockResolvedValue(undefined);

      const result = await service.deleteFullResultById(1);

      expect(result).toBeUndefined();
    });
  });
});
