import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { ClarisaSdgsService } from './clarisa-sdgs.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaSdgsService', () => {
  let service: ClarisaSdgsService;
  let findMock: jest.Mock;

  beforeEach(async () => {
    findMock = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaSdgsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: findMock,
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

    service = module.get<ClarisaSdgsService>(ClarisaSdgsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findSdgByTipFormat', () => {
    it('should parse TIP SDG labels and query active records by financial_code', async () => {
      const sdgs = [{ id: 1, financial_code: 'SDG1' }];
      findMock.mockResolvedValue(sdgs);

      const result = await service.findSdgByTipFormat([
        'SDG 1 - No Poverty',
        'SDG 2 - Zero Hunger',
      ]);

      expect(findMock).toHaveBeenCalledWith({
        where: {
          financial_code: In(['SDG1 ', 'SDG2 ']),
          is_active: true,
        },
      });
      expect(result).toEqual(sdgs);
    });

    it('should return empty array when no SDGs are provided', async () => {
      findMock.mockResolvedValue([]);

      const result = await service.findSdgByTipFormat([]);

      expect(findMock).toHaveBeenCalledWith({
        where: {
          financial_code: In([]),
          is_active: true,
        },
      });
      expect(result).toEqual([]);
    });
  });
});
