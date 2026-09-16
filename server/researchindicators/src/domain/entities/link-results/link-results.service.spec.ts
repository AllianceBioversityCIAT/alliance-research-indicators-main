import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { LinkResultsService } from './link-results.service';
import { LinkResult } from './entities/link-result.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultsService } from '../results/results.service';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

describe('LinkResultsService', () => {
  let service: LinkResultsService;
  const find = jest.fn();
  const filterResultByIndicators = jest.fn();
  const getPrincipalContractByResultsIds = jest.fn();

  const mockRepository = {
    find,
    metadata: {
      primaryColumns: [{ propertyName: 'link_result_id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  const mockCurrentUser = {
    user_id: 1,
    audit: jest.fn(() => ({ created_by: 1, updated_by: 1 })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkResultsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        {
          provide: ResultsService,
          useValue: { filterResultByIndicators },
        },
        {
          provide: ResultContractsService,
          useValue: { getPrincipalContractByResultsIds },
        },
      ],
    }).compile();

    service = module.get<LinkResultsService>(LinkResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAndDetails', () => {
    it('should attach principal contracts to other_result', async () => {
      const otherA = {
        result_id: 100,
        result_contracts: undefined,
      } as unknown as LinkResult['other_result'];
      const otherB = {
        result_id: 200,
        result_contracts: undefined,
      } as unknown as LinkResult['other_result'];
      const links = [
        { other_result_id: 100, other_result: otherA },
        { other_result_id: 200, other_result: otherB },
      ] as LinkResult[];

      find.mockResolvedValue(links);
      getPrincipalContractByResultsIds.mockResolvedValue([
        { result_id: 100, contract: 'A' },
        { result_id: 200, contract: 'B' },
      ]);

      const result = await service.findAndDetails(
        1,
        LinkResultRolesEnum.POLICY_CHANGE,
      );

      expect(find).toHaveBeenCalledWith({
        where: {
          result_id: 1,
          link_result_role_id: LinkResultRolesEnum.POLICY_CHANGE,
          is_active: true,
        },
        relations: {
          other_result: { indicator: true, result_status: true },
        },
      });
      expect(getPrincipalContractByResultsIds).toHaveBeenCalledWith([100, 200]);
      expect((result[0].other_result as any).result_contracts).toEqual([
        { result_id: 100, contract: 'A' },
      ]);
      expect((result[1].other_result as any).result_contracts).toEqual([
        { result_id: 200, contract: 'B' },
      ]);
    });

    // Non-regression guard — docs/specs/innovation-use/dev-card-details, T-05.
    // `findAndDetails` is shared by ResultPolicyChangeService.findOne,
    // LinkResultsController and ResultInnovationUseService (DD-1, non-goal:
    // widening it). This asserts against the REAL options object the real,
    // unmocked `findAndDetails` builds and passes to the repository mock —
    // not a mock of `findAndDetails` itself, which would pass with any
    // relation set. Falsifier (R-IUC-005 / K-012): adding `geo_scope: true`
    // to the service's `relations` must turn this assertion red.
    it('should request exactly { indicator, result_status } as the relation set on other_result — no more, no fewer', async () => {
      find.mockResolvedValue([]);
      getPrincipalContractByResultsIds.mockResolvedValue([]);

      await service.findAndDetails(1, LinkResultRolesEnum.POLICY_CHANGE);

      const actualOptions = find.mock.calls[0][0];
      expect(actualOptions.relations).toEqual({
        other_result: { indicator: true, result_status: true },
      });
    });
  });

  describe('saveLinkResults', () => {
    it('should filter indicators and persist via create', async () => {
      filterResultByIndicators.mockResolvedValue([10, 20]);
      const saved = [{ link_result_id: 1 } as LinkResult];
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(saved as any);

      const body = {
        link_results: [
          { other_result_id: 10 },
          { other_result_id: 99 },
        ] as LinkResult[],
      };

      const out = await service.saveLinkResults(
        5,
        body,
        [IndicatorsEnum.OICR],
        LinkResultRolesEnum.OICR_STEP_ONE,
      );

      expect(filterResultByIndicators).toHaveBeenCalledWith(
        [10, 99],
        [IndicatorsEnum.OICR],
        true,
      );
      expect(createSpy).toHaveBeenCalledWith(
        5,
        [{ other_result_id: 10 }, { other_result_id: 20 }],
        'other_result_id',
        LinkResultRolesEnum.OICR_STEP_ONE,
      );
      expect(out).toEqual({ link_results: saved });
      createSpy.mockRestore();
    });
  });
});
