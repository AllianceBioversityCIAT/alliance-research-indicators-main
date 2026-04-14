import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaActorTypesService } from './clarisa-actor-types.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaActorTypesService', () => {
  let service: ClarisaActorTypesService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaActorTypesService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              findOne: jest.fn(),
              save: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn(),
              metadata: { columns: [], relations: [] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ClarisaActorTypesService>(ClarisaActorTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 167
  describe('validateActorTypes', () => {
    it('should return ids that do not exist in the repository', async () => {
      mockFind.mockResolvedValue([{ code: 1 }, { code: 2 }]);

      const result = await service.validateActorTypes([1, 2, 3, 4]);

      expect(result).toEqual([3, 4]);
    });

    it('should return empty array when all provided ids exist', async () => {
      mockFind.mockResolvedValue([{ code: 1 }, { code: 2 }]);

      const result = await service.validateActorTypes([1, 2]);

      expect(result).toEqual([]);
    });

    it('should return all ids when none exist in the repository', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.validateActorTypes([10, 20, 30]);

      expect(result).toEqual([10, 20, 30]);
    });

    it('should return empty array when input is empty', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.validateActorTypes([]);

      expect(result).toEqual([]);
    });
  });
});
