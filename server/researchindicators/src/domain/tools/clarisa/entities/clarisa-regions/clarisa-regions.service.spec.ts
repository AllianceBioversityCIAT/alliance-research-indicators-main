import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaRegion } from './entities/clarisa-region.entity';

describe('ClarisaRegionsService', () => {
  let service: ClarisaRegionsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaRegionsService,
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

    service = module.get<ClarisaRegionsService>(ClarisaRegionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 185
  describe('findByUm49Codes', () => {
    it('should query the repository with In() for the provided um49 codes', async () => {
      const mockRegions: Partial<ClarisaRegion>[] = [
        { um49Code: 419, name: 'Latin America' },
        { um49Code: 2, name: 'Africa' },
      ];
      mockFind.mockResolvedValue(mockRegions);

      const result = await service.findByUm49Codes([419, 2]);

      expect(mockFind).toHaveBeenCalledWith({
        where: { um49Code: expect.anything() },
      });
      expect(result).toEqual(mockRegions);
    });

    it('should return empty array when no regions match the provided codes', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByUm49Codes([9999]);

      expect(result).toEqual([]);
    });

    it('should handle an empty codes array', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByUm49Codes([]);

      expect(mockFind).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
