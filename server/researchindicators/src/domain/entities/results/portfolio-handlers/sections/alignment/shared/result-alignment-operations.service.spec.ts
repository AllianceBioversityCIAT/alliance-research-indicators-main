import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultAlignmentOperationsService } from './result-alignment-operations.service';
import { ResultContractsService } from '../../../../../result-contracts/result-contracts.service';
import { ResultLeversService } from '../../../../../result-levers/result-levers.service';
import { ResultLeverStrategicOutcomeService } from '../../../../../result-lever-strategic-outcome/result-lever-strategic-outcome.service';
import { ResultLeverSdgTargetsService } from '../../../../../result-lever-sdg-targets/result-lever-sdg-targets.service';
import { ResultSdgsService } from '../../../../../result-sdgs/result-sdgs.service';
import { UpdateDataUtil } from '../../../../../../shared/utils/update-data.util';
import { ContractRolesEnum } from '../../../../../result-contracts/enum/contract-roles.enum';
import { LeverRolesEnum } from '../../../../../lever-roles/enum/lever-roles.enum';

describe('ResultAlignmentOperationsService', () => {
  let service: ResultAlignmentOperationsService;
  let resultContractsService: jest.Mocked<
    Pick<ResultContractsService, 'create' | 'find'>
  >;
  let resultLeversService: jest.Mocked<
    Pick<ResultLeversService, 'create' | 'find' | 'comparerClientToServer'>
  >;
  let resultLeverStrategicOutcomeService: jest.Mocked<
    Pick<
      ResultLeverStrategicOutcomeService,
      'create' | 'findByMultiplesResultLeverIds'
    >
  >;
  let resultLeverSdgTargetsService: jest.Mocked<
    Pick<
      ResultLeverSdgTargetsService,
      'create' | 'findByMultiplesResultLeverIds'
    >
  >;
  let resultSdgsService: jest.Mocked<
    Pick<ResultSdgsService, 'create' | 'find'>
  >;
  let updateDataUtil: jest.Mocked<
    Pick<UpdateDataUtil, 'updateLastUpdatedDate'>
  >;
  let dataSource: { transaction: jest.Mock };

  const resultId = 7;
  const manager = { id: 'entity-manager' };

  beforeEach(async () => {
    resultContractsService = { create: jest.fn(), find: jest.fn() };
    resultLeversService = {
      create: jest.fn(),
      find: jest.fn(),
      comparerClientToServer: jest.fn(),
    };
    resultLeverStrategicOutcomeService = {
      create: jest.fn(),
      findByMultiplesResultLeverIds: jest.fn(),
    };
    resultLeverSdgTargetsService = {
      create: jest.fn(),
      findByMultiplesResultLeverIds: jest.fn(),
    };
    resultSdgsService = { create: jest.fn(), find: jest.fn() };
    updateDataUtil = { updateLastUpdatedDate: jest.fn() };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultAlignmentOperationsService,
        { provide: DataSource, useValue: dataSource },
        { provide: ResultContractsService, useValue: resultContractsService },
        { provide: ResultLeversService, useValue: resultLeversService },
        {
          provide: ResultLeverStrategicOutcomeService,
          useValue: resultLeverStrategicOutcomeService,
        },
        {
          provide: ResultLeverSdgTargetsService,
          useValue: resultLeverSdgTargetsService,
        },
        { provide: ResultSdgsService, useValue: resultSdgsService },
        { provide: UpdateDataUtil, useValue: updateDataUtil },
      ],
    }).compile();

    service = module.get(ResultAlignmentOperationsService);
  });

  describe('save', () => {
    it('should persist alignment data using the provided entity manager', async () => {
      const alignmentData = {
        contracts: [{ contract_id: 'C1', is_primary: true }],
        primary_levers: [
          {
            lever_id: 'L1',
            is_primary: true,
            result_lever_strategic_outcomes: [
              { lever_strategic_outcome_id: 1 },
            ],
            result_lever_sdg_targets: [{ sdg_target_id: 10 }],
          },
        ],
        contributor_levers: [{ lever_id: 'L2', result_lever_sdg_targets: [] }],
        result_sdgs: [{ clarisa_sdg_id: 5 }],
      } as any;

      const newLevers = [{ result_lever_id: 100, lever_id: 'L1' }];
      const emergedLevers = [
        {
          result_lever_id: 100,
          lever_id: 'L1',
          result_lever_strategic_outcomes: [{ lever_strategic_outcome_id: 1 }],
          result_lever_sdg_targets: [{ sdg_target_id: 10 }],
        },
      ];

      resultLeversService.create.mockResolvedValue(newLevers as any);
      resultLeversService.comparerClientToServer.mockResolvedValue(
        emergedLevers as any,
      );
      resultContractsService.find.mockResolvedValue([]);
      resultLeversService.find.mockResolvedValue([]);
      resultLeverSdgTargetsService.findByMultiplesResultLeverIds.mockResolvedValue(
        [],
      );
      resultLeverStrategicOutcomeService.findByMultiplesResultLeverIds.mockResolvedValue(
        [],
      );
      resultSdgsService.find.mockResolvedValue([]);

      await service.save(resultId, alignmentData, manager as any);

      expect(resultContractsService.create).toHaveBeenCalledWith(
        resultId,
        alignmentData.contracts,
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
        { is_primary: false },
      );
      expect(resultLeversService.create).toHaveBeenCalledWith(
        resultId,
        expect.arrayContaining([
          expect.objectContaining({ lever_id: 'L1', is_primary: true }),
          expect.objectContaining({ lever_id: 'L2', is_primary: false }),
        ]),
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
        { is_primary: false },
      );
      expect(resultLeverStrategicOutcomeService.create).toHaveBeenCalled();
      expect(resultLeverSdgTargetsService.create).toHaveBeenCalled();
      expect(resultSdgsService.create).toHaveBeenCalledWith(
        resultId,
        alignmentData.result_sdgs,
        'clarisa_sdg_id',
        undefined,
        manager,
      );
      expect(updateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
        manager,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should run in a transaction and return find result when no manager is passed', async () => {
      const alignmentData = {
        contracts: [],
        primary_levers: [],
        contributor_levers: [],
        result_sdgs: [],
      } as any;
      const expected = {
        contracts: [],
        primary_levers: [],
        contributor_levers: [],
        result_sdgs: [],
      };

      resultLeversService.create.mockResolvedValue([]);
      resultLeversService.comparerClientToServer.mockResolvedValue([]);
      resultContractsService.find.mockResolvedValue([]);
      resultLeversService.find.mockResolvedValue([]);
      resultLeverSdgTargetsService.findByMultiplesResultLeverIds.mockResolvedValue(
        [],
      );
      resultLeverStrategicOutcomeService.findByMultiplesResultLeverIds.mockResolvedValue(
        [],
      );
      resultSdgsService.find.mockResolvedValue([]);

      const result = await service.save(resultId, alignmentData);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('find', () => {
    it('should aggregate contracts, levers, sdg targets and result sdgs', async () => {
      const levers = [
        {
          result_lever_id: 1,
          lever_id: 'L1',
          is_primary: true,
        },
        {
          result_lever_id: 2,
          lever_id: 'L2',
          is_primary: false,
        },
      ];
      const sdgTargets = [
        { result_lever_id: 1, sdg_target_id: 10 },
        { result_lever_id: 2, sdg_target_id: 20 },
      ];
      const strategicOutcomes = [
        { result_lever_id: 1, lever_strategic_outcome_id: 5 },
      ];

      resultContractsService.find.mockResolvedValue([
        { contract_id: 'C1' },
      ] as any);
      resultLeversService.find.mockResolvedValue(levers as any);
      resultLeverSdgTargetsService.findByMultiplesResultLeverIds.mockResolvedValue(
        sdgTargets as any,
      );
      resultLeverStrategicOutcomeService.findByMultiplesResultLeverIds.mockResolvedValue(
        strategicOutcomes as any,
      );
      resultSdgsService.find.mockResolvedValue([{ clarisa_sdg_id: 3 }] as any);

      const result = await service.find(resultId);

      expect(resultContractsService.find).toHaveBeenCalledWith(
        resultId,
        ContractRolesEnum.ALIGNMENT,
      );
      expect(resultLeversService.find).toHaveBeenCalledWith(
        resultId,
        LeverRolesEnum.ALIGNMENT,
      );
      expect(result.primary_levers).toHaveLength(1);
      expect(result.primary_levers[0].result_lever_strategic_outcomes).toEqual(
        strategicOutcomes,
      );
      expect(result.primary_levers[0].result_lever_sdg_targets).toEqual([
        sdgTargets[0],
      ]);
      expect(result.contributor_levers).toHaveLength(1);
      expect(result.contributor_levers[0].result_lever_sdg_targets).toEqual([
        sdgTargets[1],
      ]);
      expect(result.result_sdgs).toEqual([{ clarisa_sdg_id: 3 }]);
    });
  });
});
