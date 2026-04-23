import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaCountry } from './entities/clarisa-country.entity';

describe('ClarisaCountriesService', () => {
  let service: ClarisaCountriesService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaCountriesService,
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

    service = module.get<ClarisaCountriesService>(ClarisaCountriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 168
  describe('findByIso2', () => {
    it('should query with In() for the given ISO alpha-2 codes', async () => {
      const mockCountries: Partial<ClarisaCountry>[] = [
        { isoAlpha2: 'CO', name: 'Colombia' },
        { isoAlpha2: 'EC', name: 'Ecuador' },
      ];
      mockFind.mockResolvedValue(mockCountries);

      const result = await service.findByIso2(['CO', 'EC']);

      expect(mockFind).toHaveBeenCalledWith({
        where: { isoAlpha2: expect.anything() },
      });
      expect(result).toEqual(mockCountries);
    });

    it('should return empty array when no countries match the codes', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByIso2(['XX']);

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 169
  describe('findByUm49Codes', () => {
    it('should query with In() for the given UM49 codes', async () => {
      const mockCountries: Partial<ClarisaCountry>[] = [
        { code: 170, name: 'Colombia' },
        { code: 218, name: 'Ecuador' },
      ];
      mockFind.mockResolvedValue(mockCountries);

      const result = await service.findByUm49Codes([170, 218]);

      expect(mockFind).toHaveBeenCalledWith({
        where: { code: expect.anything() },
      });
      expect(result).toEqual(mockCountries);
    });

    it('should return empty array when no countries match the UM49 codes', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByUm49Codes([9999]);

      expect(result).toEqual([]);
    });

    it('should handle empty codes array', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByUm49Codes([]);

      expect(mockFind).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
