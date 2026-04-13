import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultEvidencesService } from './result-evidences.service';
import { ResultEvidence } from './entities/result-evidence.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultNotableReferencesService } from '../result-notable-references/result-notable-references.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { EvidenceRoleEnum } from '../evidence-roles/enums/evidence-role.enum';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';

describe('ResultEvidencesService', () => {
  let service: ResultEvidencesService;
  const find = jest.fn();
  const transaction = jest.fn();

  const mockRepository = {
    find,
    metadata: {
      primaryColumns: [{ propertyName: 'result_evidence_id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
    transaction,
  };

  const mockCurrentUser = {
    user_id: 1,
    audit: jest.fn(() => ({ created_by: 1, updated_by: 1 })),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn().mockResolvedValue(undefined),
  };

  const mockNotableRefs = {
    upsertByCompositeKeys: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([{ id: 1 }]),
  };

  const resultsUtilStub = { indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT };

  beforeEach(async () => {
    jest.clearAllMocks();
    resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultEvidencesService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        {
          provide: ResultNotableReferencesService,
          useValue: mockNotableRefs,
        },
        {
          provide: ResultsUtil,
          useValue: resultsUtilStub as unknown as ResultsUtil,
        },
      ],
    }).compile();

    service = module.get<ResultEvidencesService>(ResultEvidencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateResultEvidences', () => {
    it('should run transaction, create evidences and touch last updated', async () => {
      const saved = [{ result_evidence_id: 1 } as ResultEvidence];
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(saved as any);

      transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<unknown>) => cb({}),
      );

      const body: CreateResultEvidenceDto = {
        evidence: [
          { evidence_description: 'd', evidence_url: 'http://x' } as any,
        ],
      };

      const out = await service.updateResultEvidences(4, body);

      expect(transaction).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
        4,
        body.evidence,
        'evidence_url',
        EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
        {},
        ['evidence_description', 'is_private'],
      );
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        4,
        {},
      );
      expect(out).toBe(saved);
      expect(mockNotableRefs.upsertByCompositeKeys).not.toHaveBeenCalled();
      createSpy.mockRestore();
    });

    it('should upsert notable references for OICR indicator', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      jest.spyOn(service, 'create').mockResolvedValue([] as any);
      transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<unknown>) => cb({}),
      );

      const body: CreateResultEvidenceDto = {
        evidence: [{ evidence_url: 'u' } as any],
        notable_references: [
          { link: 'l', notable_reference_type_id: 1 } as any,
        ],
      };

      await service.updateResultEvidences(2, body);

      expect(mockNotableRefs.upsertByCompositeKeys).toHaveBeenCalledWith(
        2,
        body.notable_references,
        ['notable_reference_type_id', 'link'],
      );
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
    });
  });

  describe('findPrincipalEvidence', () => {
    it('should return evidences without notable refs when not OICR', async () => {
      const ev = [{ result_evidence_id: 9 } as ResultEvidence];
      find.mockResolvedValue(ev);

      const out = await service.findPrincipalEvidence(5);

      expect(find).toHaveBeenCalledWith({
        where: {
          evidence_role_id: EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
          result_id: 5,
          is_active: true,
        },
      });
      expect(out).toEqual({ evidence: ev, notable_references: null });
    });

    it('should include notable references for OICR', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      find.mockResolvedValue([]);
      mockNotableRefs.find.mockResolvedValue([{ ref: 1 }]);

      const out = await service.findPrincipalEvidence(6);

      expect(mockNotableRefs.find).toHaveBeenCalledWith(6);
      expect(out.notable_references).toEqual([{ ref: 1 }]);
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
    });
  });
});
