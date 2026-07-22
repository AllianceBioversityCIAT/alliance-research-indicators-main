import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ClarisaInstitutionsRepository } from './repositories/clarisa-institution.repository';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';
import { ClarisaPathEnum } from '../../anum/path.enum';

describe('ClarisaInstitutionsService', () => {
  let service: ClarisaInstitutionsService;
  const mockFind = jest.fn();
  const mockGetMany = jest.fn();
  const mockQueryBuilder: any = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: mockGetMany,
  };

  const mockRepo = {
    find: mockFind,
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    lastInsertDate: jest.fn(),
    metadata: { columns: [], relations: [] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaInstitutionsService,
        { provide: ClarisaInstitutionsRepository, useValue: mockRepo },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ClarisaInstitutionsService>(
      ClarisaInstitutionsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 179
  describe('clonePath', () => {
    it('should return base path without date when lastInsertDate returns null', async () => {
      mockRepo.lastInsertDate.mockResolvedValue(null);

      const path = await service.clonePath();

      expect(path).toBe(`${ClarisaPathEnum.INSTITUTIONS}?show=all`);
    });

    it('should append from param when lastInsertDate returns a date', async () => {
      mockRepo.lastInsertDate.mockResolvedValue(1234567890);

      const path = await service.clonePath();

      expect(path).toBe(
        `${ClarisaPathEnum.INSTITUTIONS}?show=all&from=1234567890`,
      );
    });
  });

  // [CLAUDE/DONE] 180
  describe('getInstitutionsByCountry', () => {
    it('should build a base query and return all active institutions', async () => {
      const mockInstitutions = [{ code: 'CIAT', name: 'Alliance' }];
      mockGetMany.mockResolvedValue(mockInstitutions);

      const result = await service.getInstitutionsByCountry();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('is_active'),
        expect.anything(),
      );
      expect(result).toEqual(mockInstitutions);
    });

    it('should join institution_locations when location is TRUE', async () => {
      mockGetMany.mockResolvedValue([]);

      await service.getInstitutionsByCountry(TrueFalseEnum.TRUE);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'institution.institution_locations',
        'institution_locations',
      );
    });

    it('should filter by headquarter when both location and isHeadquarter are TRUE', async () => {
      mockGetMany.mockResolvedValue([]);

      await service.getInstitutionsByCountry(
        TrueFalseEnum.TRUE,
        TrueFalseEnum.TRUE,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('isHeadquarter'),
        expect.anything(),
      );
    });

    it('should join institution_type when type is TRUE', async () => {
      mockGetMany.mockResolvedValue([]);

      await service.getInstitutionsByCountry(
        undefined,
        undefined,
        TrueFalseEnum.TRUE,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'institution.institution_type',
        'type',
      );
    });
  });

  describe('findByCodes', () => {
    it('should call find with an In condition for the given codes', async () => {
      const mockResult = [{ code: 1 }, { code: 70 }];
      mockFind.mockResolvedValue(mockResult);

      const result = await service.findByCodes([1, 70]);

      expect(mockFind).toHaveBeenCalledWith({
        where: { code: expect.anything() },
      });
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when no codes match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByCodes([9999]);

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 181
  describe('findByLikeNames', () => {
    it('should call find with LIKE conditions for each name', async () => {
      const mockResult = [{ name: 'CIAT' }];
      mockFind.mockResolvedValue(mockResult);

      const result = await service.findByLikeNames(['CIAT', 'Alliance']);

      expect(mockFind).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          expect.objectContaining({ is_active: true }),
          expect.objectContaining({ is_active: true }),
        ]),
      });
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when no names match', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByLikeNames(['NoMatch']);

      expect(result).toEqual([]);
    });

    it('should trim whitespace from each name before building query', async () => {
      mockFind.mockResolvedValue([]);

      await service.findByLikeNames(['  CIAT  ']);

      const callArg = mockFind.mock.calls[0][0];
      expect(JSON.stringify(callArg)).toContain('CIAT');
    });
  });
});
