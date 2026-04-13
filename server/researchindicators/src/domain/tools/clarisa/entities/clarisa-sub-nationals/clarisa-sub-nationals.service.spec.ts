import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaSubNational } from './entities/clarisa-sub-national.entity';

describe('ClarisaSubNationalsService', () => {
  let service: ClarisaSubNationalsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaSubNationalsService,
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

    service = module.get<ClarisaSubNationalsService>(ClarisaSubNationalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 186
  describe('findByCodes', () => {
    it('should query the repository with the provided codes and is_active = true', async () => {
      const mockSubNationals: Partial<ClarisaSubNational>[] = [
        { id: 1, code: 'CO-ANT', name: 'Antioquia', country_iso_alpha_2: 'CO' },
        { id: 2, code: 'CO-BOG', name: 'Bogota', country_iso_alpha_2: 'CO' },
      ];
      mockFind.mockResolvedValue(mockSubNationals);

      const result = await service.findByCodes(['CO-ANT', 'CO-BOG']);

      expect(mockFind).toHaveBeenCalledWith({
        where: { code: expect.anything(), is_active: true },
      });
      expect(result).toEqual(mockSubNationals);
    });

    it('should return empty array when no codes match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByCodes(['NONEXISTENT']);

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 187
  describe('findSubNationalsByCountryIso2', () => {
    it('should query by country_iso_alpha_2 and is_active = true', async () => {
      const mockSubNationals: Partial<ClarisaSubNational>[] = [
        { id: 1, code: 'CO-ANT', name: 'Antioquia', country_iso_alpha_2: 'CO' },
      ];
      mockFind.mockResolvedValue(mockSubNationals);

      const result = await service.findSubNationalsByCountryIso2('CO');

      expect(mockFind).toHaveBeenCalledWith({
        where: { country_iso_alpha_2: 'CO', is_active: true },
      });
      expect(result).toEqual(mockSubNationals);
    });

    it('should return empty array when country has no active sub-nationals', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findSubNationalsByCountryIso2('ZZ');

      expect(result).toEqual([]);
    });
  });
});
