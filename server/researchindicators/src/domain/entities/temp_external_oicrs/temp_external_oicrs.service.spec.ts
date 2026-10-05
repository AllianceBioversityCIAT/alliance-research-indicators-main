import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { TempExternalOicr } from './entities/temp_external_oicr.entity';
import { ExternalOicrSourceEnum } from './enum/external-oicr-source.enum';
import { Result } from '../results/entities/result.entity';
import { ResultOicr } from '../result-oicr/entities/result-oicr.entity';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { ResultCountriesSubNational } from '../result-countries-sub-nationals/entities/result-countries-sub-national.entity';
import { AppConfigKey } from '../app-config/enum/app-config-key.enum';
import { ResultStatus } from '../result-status/entities/result-status.entity';

describe('TempExternalOicrsService', () => {
  let service: TempExternalOicrsService;
  const mockMainFind = jest.fn();
  const mockExternalFind = jest.fn();
  const mockExternalFindOne = jest.fn();
  const mockQuery = jest.fn();
  // Repositories read when prefilling from an OICR stored in `results`.
  const resultRepos = new Map<unknown, { find: jest.Mock; findOne: jest.Mock }>(
    [
      Result,
      ResultOicr,
      ResultUser,
      ResultLever,
      ResultCountry,
      ResultRegion,
      ResultCountriesSubNational,
      ResultStatus,
    ].map((entity) => [
      entity,
      { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() },
    ]),
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TempExternalOicrsService,
        {
          provide: DataSource,
          useValue: {
            query: mockQuery,
            getRepository: jest.fn().mockImplementation((entity) => {
              if (resultRepos.has(entity)) return resultRepos.get(entity);
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
    const resultOicr = {
      id: '3311',
      source: ExternalOicrSourceEnum.RESULT,
      title: 'Result OICR',
      external_id: '3138',
      oicr_internal_code: 'OICR-LAC-2025-01',
      maturity_level: '2',
      report_year: '2025',
      result_status_id: 10,
      result_status: 'OICR Accepted',
      handle_link: null,
    };
    const accepted = {
      result_status_id: 10,
      name: 'OICR Accepted',
      description: 'Accepted',
      config: { color: { text: '#7CB580' }, icon: { name: 'pi pi-check' } },
    };
    const published = {
      result_status_id: 14,
      name: 'OICR Published',
      description: 'Published',
      config: { color: { text: '#358540' } },
    };

    beforeEach(() => {
      resultRepos
        .get(ResultStatus)
        .find.mockResolvedValue([accepted, published]);
    });

    // First query reads OICR.REPORTING_YEAR, second one the OICR results.
    const arrangeQueries = (yearValue: string | null, rows: unknown[]) =>
      mockQuery
        .mockResolvedValueOnce(
          yearValue == null ? [] : [{ simple_value: yearValue }],
        )
        .mockResolvedValueOnce(rows);

    it('returns TEMP rows and OICR results, each with its source and status config', async () => {
      mockExternalFind.mockResolvedValue([
        { id: 1, is_active: true, result_status: 'published' },
        { id: 2, is_active: true, result_status: null },
      ]);
      arrangeQueries('2026', [resultOicr]);

      const result = await service.findExternalOicrs();

      expect(mockExternalFind).toHaveBeenCalledWith({
        where: { is_active: true },
      });
      const { result_status_id: _statusId, ...resultOption } = resultOicr;
      expect(result).toEqual([
        {
          id: 1,
          is_active: true,
          result_status: 'published',
          source: ExternalOicrSourceEnum.EXTERNAL,
          oicr_internal_code: null,
          status: published,
        },
        {
          id: 2,
          is_active: true,
          result_status: null,
          source: ExternalOicrSourceEnum.EXTERNAL,
          oicr_internal_code: null,
          status: null,
        },
        { ...resultOption, id: 3311, status: accepted },
      ]);
    });

    it('carries result_oicrs.oicr_internal_code on the result-sourced options', async () => {
      mockExternalFind.mockResolvedValue([]);
      arrangeQueries('2026', [resultOicr]);

      const result = await service.findExternalOicrs();

      expect(mockQuery.mock.calls[1][0]).toContain('ro.oicr_internal_code');
      expect(result[0]).toMatchObject({
        external_id: '3138',
        oicr_internal_code: 'OICR-LAC-2025-01',
      });
    });

    it('only offers OICR results reported before OICR.REPORTING_YEAR', async () => {
      mockExternalFind.mockResolvedValue([]);
      arrangeQueries('2027', []);

      await service.findExternalOicrs();

      expect(mockQuery.mock.calls[0][1]).toEqual([
        AppConfigKey.OICR_REPORTING_YEAR,
      ]);
      const [sql, params] = mockQuery.mock.calls[1];
      expect(sql).toContain('r.report_year_id < ?');
      expect(sql).toContain('r.is_snapshot = FALSE');
      expect(params).toEqual([ExternalOicrSourceEnum.RESULT, 5, 2027]);
    });

    it.each([null, '', 'next year'])(
      'falls back to 2026 when OICR.REPORTING_YEAR is unusable (%p)',
      async (value) => {
        mockExternalFind.mockResolvedValue([]);
        arrangeQueries(value, []);

        await service.findExternalOicrs();

        expect(mockQuery.mock.calls[1][1][2]).toBe(2026);
      },
    );

    it('should return empty array when no OICR exists in either table', async () => {
      mockExternalFind.mockResolvedValue([]);
      arrangeQueries('2026', []);

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

    it('reads an OICR stored in results when source=result, including sub-national levels', async () => {
      resultRepos.get(Result).findOne.mockResolvedValue({
        result_id: 3311,
        geo_scope_id: 3, // MULTI_NATIONAL is shown as NATIONAL by the client
        comment_geo_scope: 'Geo comment',
      });
      resultRepos.get(ResultOicr).findOne.mockResolvedValue({
        outcome_impact_statement: 'Result narrative',
        maturity_level_id: 2,
      });
      resultRepos.get(ResultUser).findOne.mockResolvedValue({ user_id: 'u-1' });
      resultRepos.get(ResultLever).find.mockResolvedValue([{ lever_id: '3' }]);
      resultRepos.get(ResultCountry).find.mockResolvedValue([
        { result_country_id: 10, isoAlpha2: 'CO' },
        { result_country_id: 11, isoAlpha2: 'KE' },
      ]);
      resultRepos
        .get(ResultRegion)
        .find.mockResolvedValue([{ region_id: 419 }]);
      resultRepos
        .get(ResultCountriesSubNational)
        .find.mockResolvedValue([
          { result_country_id: 10, sub_national_id: 7 },
        ]);

      const result = await service.mappingExternalOicrs(
        3311,
        ExternalOicrSourceEnum.RESULT,
      );

      expect(mockExternalFindOne).not.toHaveBeenCalled();
      expect(result.step_one.outcome_impact_statement).toBe('Result narrative');
      expect(result.step_one.main_contact_person).toEqual({ user_id: 'u-1' });
      expect(result.step_two.contributor_lever).toEqual([{ lever_id: '3' }]);
      expect(result.step_three.geo_scope_id).toBe(4);
      expect(result.step_three.comment_geo_scope).toBe('Geo comment');
      expect(result.step_three.regions).toEqual([{ region_id: 419 }]);
      expect(result.step_three.countries).toEqual([
        {
          isoAlpha2: 'CO',
          result_countries_sub_nationals: [
            { result_country_id: 10, sub_national_id: 7 },
          ],
        },
        { isoAlpha2: 'KE', result_countries_sub_nationals: [] },
      ]);
      expect(result.extra_info.maturity_level).toBe(2);
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
