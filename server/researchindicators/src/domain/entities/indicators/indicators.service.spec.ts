import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorsService } from './indicators.service';
import { IndicatorRepository } from './repository/indicators.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { Indicator } from './entities/indicator.entity';

describe('IndicatorsService', () => {
  let service: IndicatorsService;
  const find = jest.fn();
  const findOne = jest.fn();
  const findIndicatorByAmmountResults = jest.fn();
  const findAmountResultsByIndicatorCurrentUser = jest.fn();

  const mockRepository = {
    find,
    findOne,
    findIndicatorByAmmountResults,
    findAmountResultsByIndicatorCurrentUser,
    metadata: {
      primaryColumns: [{ propertyName: 'indicator_id' }],
    },
  };

  const mockCurrentUser = {
    user_id: 42,
    user: { sec_user_id: 42 },
    audit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicatorsService,
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        {
          provide: IndicatorRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IndicatorsService>(IndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active indicators ordered by position', async () => {
      const rows = [{ indicator_id: 1 } as Indicator];
      find.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: { indicatorType: true },
        order: { position: 'ASC' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('customFindOne', () => {
    it('should find one indicator by id with relations', async () => {
      const row = { indicator_id: 7 } as Indicator;
      findOne.mockResolvedValue(row);

      const result = await service.customFindOne(7);

      expect(findOne).toHaveBeenCalledWith({
        where: { indicator_id: 7, is_active: true },
        relations: { indicatorType: true },
        order: { position: 'ASC' },
      });
      expect(result).toBe(row);
    });
  });

  describe('findIndicatorByAmmountResults', () => {
    it('should delegate to repository', async () => {
      const rows = [{ indicator_id: 1 } as Indicator];
      findIndicatorByAmmountResults.mockResolvedValue(rows);

      const result = await service.findIndicatorByAmmountResults();

      expect(findIndicatorByAmmountResults).toHaveBeenCalled();
      expect(result).toBe(rows);
    });
  });

  describe('findResultsAmountByIndicatorCurrentUser', () => {
    it('should delegate to repository', async () => {
      const rows = [{ indicator_id: 1, amount_results: 3 } as any];
      findAmountResultsByIndicatorCurrentUser.mockResolvedValue(rows);

      const result = await service.findResultsAmountByIndicatorCurrentUser();

      expect(findAmountResultsByIndicatorCurrentUser).toHaveBeenCalled();
      expect(result).toBe(rows);
    });
  });
});
