import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { TempExternalOicr } from './entities/temp_external_oicr.entity';

describe('TempExternalOicrsService', () => {
  let service: TempExternalOicrsService;
  const mockMainFind = jest.fn();
  const mockExternalFind = jest.fn();
  const mockExternalFindOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TempExternalOicrsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === TempExternalOicr) {
                return {
                  find: mockExternalFind,
                  findOne: mockExternalFindOne,
                };
              }
              return {
                find: mockMainFind,
                findOne: jest.fn(),
                save: jest.fn(),
                metadata: {
                  primaryColumns: [{ propertyName: 'result_id' }],
                },
              };
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: { user_id: 1 } },
      ],
    }).compile();

    service = module.get<TempExternalOicrsService>(TempExternalOicrsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 152
  describe('findExternalOicrs', () => {
    it('should return all active external OICRs', async () => {
      const mockOicrs = [
        { id: 1, is_active: true },
        { id: 2, is_active: true },
      ];
      mockExternalFind.mockResolvedValue(mockOicrs);

      const result = await service.findExternalOicrs();

      expect(mockExternalFind).toHaveBeenCalledWith({
        where: { is_active: true },
      });
      expect(result).toEqual(mockOicrs);
    });

    it('should return empty array when no active external OICRs exist', async () => {
      mockExternalFind.mockResolvedValue([]);

      const result = await service.findExternalOicrs();

      expect(result).toEqual([]);
    });
  });

  // [CLAUDE/DONE] 153
  describe('mappingExternalOicrs', () => {
    it('should map external OICR data to CreateResultOicrDto', async () => {
      const mockExternal: Partial<TempExternalOicr> = {
        id: 1,
        lever_list: 'L1; L2',
        main_contact_person_list: 'user123; user456',
        country_list: 'CO; EC',
        region_list: '419; 2',
        geo_scope_id: 3,
        geo_scope_comment: 'Some comment',
        elaboration_narrative: 'Impact narrative',
        maturity_level: '4',
      };
      mockExternalFindOne.mockResolvedValue(mockExternal);

      const result = await service.mappingExternalOicrs(1);

      expect(mockExternalFindOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.step_one.main_contact_person).toEqual({
        user_id: 'user123',
      });
      expect(result.step_one.outcome_impact_statement).toBe('Impact narrative');
      expect(result.step_two.contributor_lever).toHaveLength(2);
      expect(result.step_three.countries).toHaveLength(2);
      expect(result.step_three.geo_scope_id).toBe(3);
      expect(result.extra_info.maturity_level).toBe(4);
    });

    it('should handle null lists gracefully', async () => {
      const mockExternal: Partial<TempExternalOicr> = {
        id: 2,
        lever_list: null,
        main_contact_person_list: null,
        country_list: null,
        region_list: null,
        geo_scope_id: null,
        geo_scope_comment: null,
        elaboration_narrative: null,
        maturity_level: null,
      };
      mockExternalFindOne.mockResolvedValue(mockExternal);

      const result = await service.mappingExternalOicrs(2);

      expect(result.step_two.contributor_lever).toBeUndefined();
      expect(result.step_three.countries).toBeUndefined();
    });
  });
});
