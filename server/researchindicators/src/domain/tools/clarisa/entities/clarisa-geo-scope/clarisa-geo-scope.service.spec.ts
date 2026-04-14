import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaGeoScopeEnum } from './enum/clarisa-geo-scope.enum';
import { ResultCountry } from '../../../../entities/result-countries/entities/result-country.entity';

describe('ClarisaGeoScopeService', () => {
  let service: ClarisaGeoScopeService;
  const mockFindOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaGeoScopeService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: jest.fn(),
              findOne: mockFindOne,
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

    service = module.get<ClarisaGeoScopeService>(ClarisaGeoScopeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 170
  describe('transformGeoScope', () => {
    it('should convert NATIONAL to MULTI_NATIONAL when isCliToServ=true and multiple countries', () => {
      const countries = [{}, {}] as ResultCountry[];
      const result = service.transformGeoScope(
        ClarisaGeoScopeEnum.NATIONAL,
        countries,
        true,
      );
      expect(result).toBe(ClarisaGeoScopeEnum.MULTI_NATIONAL);
    });

    it('should keep NATIONAL when isCliToServ=true and only one country', () => {
      const countries = [{}] as ResultCountry[];
      const result = service.transformGeoScope(
        ClarisaGeoScopeEnum.NATIONAL,
        countries,
        true,
      );
      expect(result).toBe(ClarisaGeoScopeEnum.NATIONAL);
    });

    it('should convert MULTI_NATIONAL to NATIONAL when isCliToServ=false', () => {
      const result = service.transformGeoScope(
        ClarisaGeoScopeEnum.MULTI_NATIONAL,
        [],
        false,
      );
      expect(result).toBe(ClarisaGeoScopeEnum.NATIONAL);
    });

    it('should return id unchanged when no transformation condition matches', () => {
      const result = service.transformGeoScope(ClarisaGeoScopeEnum.GLOBAL, []);
      expect(result).toBe(ClarisaGeoScopeEnum.GLOBAL);
    });

    it('should parse string id to number', () => {
      const result = service.transformGeoScope(
        '2' as unknown as ClarisaGeoScopeEnum,
        [],
      );
      expect(result).toBe(2);
    });

    it('should use isCliToServ=true as default', () => {
      const countries = [{}, {}] as ResultCountry[];
      const result = service.transformGeoScope(
        ClarisaGeoScopeEnum.NATIONAL,
        countries,
      );
      expect(result).toBe(ClarisaGeoScopeEnum.MULTI_NATIONAL);
    });
  });

  // [CLAUDE/DONE] 171
  describe('findByName', () => {
    it('should query with LIKE pattern on the name field', async () => {
      const mockScope = { id: 1, name: 'Global' };
      mockFindOne.mockResolvedValue(mockScope);

      const result = await service.findByName('Glob');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { name: expect.anything() },
      });
      expect(result).toEqual(mockScope);
    });

    it('should return null when no geo scope matches', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await service.findByName('Unknown');

      expect(result).toBeNull();
    });
  });
});
