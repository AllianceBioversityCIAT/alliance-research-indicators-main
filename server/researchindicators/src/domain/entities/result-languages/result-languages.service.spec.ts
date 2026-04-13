import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultLanguagesService } from './result-languages.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LanguageRolesEnum } from '../language-roles/enums/language-roles.enum';

describe('ResultLanguagesService', () => {
  let service: ResultLanguagesService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultLanguagesService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              save: jest.fn(),
              metadata: {
                primaryColumns: [{ propertyName: 'result_language_id' }],
              },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: { audit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ResultLanguagesService>(ResultLanguagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 82
  describe('findLanguageByRoleResult', () => {
    it('should return active languages with language relation for the given role and resultId', async () => {
      const mockLanguages = [
        {
          result_language_id: 1,
          language_role_id: LanguageRolesEnum.TRAINING_SUPERVISOR,
          result_id: 10,
        },
      ];
      mockFind.mockResolvedValue(mockLanguages);

      const result = await service.findLanguageByRoleResult(
        LanguageRolesEnum.TRAINING_SUPERVISOR,
        10,
      );

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          language_role_id: LanguageRolesEnum.TRAINING_SUPERVISOR,
          result_id: 10,
          is_active: true,
        },
        relations: { language: true },
      });
      expect(result).toEqual(mockLanguages);
    });

    it('should return empty array when no languages match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findLanguageByRoleResult(
        LanguageRolesEnum.TRAINING_SUPERVISOR,
        99,
      );

      expect(result).toEqual([]);
    });
  });
});
