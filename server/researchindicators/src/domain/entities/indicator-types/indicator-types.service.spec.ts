import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { IndicatorTypesService } from './indicator-types.service';
import { IndicatorType } from './entities/indicator-type.entity';

describe('IndicatorTypesService', () => {
  let service: IndicatorTypesService;
  const find = jest.fn();

  const mockRepository = {
    find,
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicatorTypesService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<IndicatorTypesService>(IndicatorTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active indicator types with indicators relation', async () => {
      const rows = [{ indicator_type_id: 1 } as IndicatorType];
      find.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(IndicatorType);
      expect(find).toHaveBeenCalledWith({
        where: { is_active: true },
        relations: { indicators: true },
      });
      expect(result).toBe(rows);
    });
  });
});
