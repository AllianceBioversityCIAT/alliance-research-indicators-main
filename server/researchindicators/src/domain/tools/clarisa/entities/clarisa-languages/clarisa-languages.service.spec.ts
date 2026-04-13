import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaLanguagesService } from './clarisa-languages.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ClarisaLanguage } from './entities/clarisa-language.entity';

describe('ClarisaLanguagesService', () => {
  let service: ClarisaLanguagesService;
  const mockFindOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaLanguagesService,
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

    service = module.get<ClarisaLanguagesService>(ClarisaLanguagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 182
  describe('findOneByiso3', () => {
    it('should query the repository with iso_alpha_3 equal to the given value', async () => {
      const mockLanguage: Partial<ClarisaLanguage> = {
        id: 1,
        name: 'English',
        iso_alpha_3: 'eng',
      };
      mockFindOne.mockResolvedValue(mockLanguage);

      const result = await service.findOneByiso3('eng');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { iso_alpha_3: 'eng' },
      });
      expect(result).toEqual(mockLanguage);
    });

    it('should return null when no language matches the iso3 code', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await service.findOneByiso3('xyz');

      expect(result).toBeNull();
    });
  });
});
