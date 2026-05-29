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
import { ResultOicr } from '../result-oicr/entities/result-oicr.entity';

describe('ResultEvidencesService', () => {
  let service: ResultEvidencesService;
  const find = jest.fn();
  const transaction = jest.fn();
  const oicrUpdate = jest.fn().mockResolvedValue(undefined);
  const oicrFindOne = jest.fn();

  const mockRepository = {
    find,
    metadata: {
      primaryColumns: [{ propertyName: 'result_evidence_id' }],
    },
  };

  const mockOicrRepository = {
    update: oicrUpdate,
    findOne: oicrFindOne,
  };

  const mockDataSource = {
    getRepository: jest.fn((entity) =>
      entity === ResultOicr ? mockOicrRepository : mockRepository,
    ),
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

    it('should upsert notable references and persist cgspace_link for OICR indicator', async () => {
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
        cgspace_link: 'https://cgspace.cgiar.org/handle/10568/12345',
      };

      await service.updateResultEvidences(2, body);

      expect(mockNotableRefs.upsertByCompositeKeys).toHaveBeenCalledWith(
        2,
        body.notable_references,
        ['notable_reference_type_id', 'link'],
      );
      expect(oicrUpdate).toHaveBeenCalledWith(2, {
        cgspace_link: body.cgspace_link,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
    });

    it('should not update cgspace_link when indicator is not OICR', async () => {
      jest.spyOn(service, 'create').mockResolvedValue([] as any);
      transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<unknown>) => cb({}),
      );

      await service.updateResultEvidences(3, {
        evidence: [{ evidence_url: 'u' } as any],
        cgspace_link: 'https://cgspace.cgiar.org/handle/10568/99999',
      });

      expect(oicrUpdate).not.toHaveBeenCalled();
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
      expect(out).toEqual({
        evidence: ev,
        notable_references: null,
        cgspace_link: null,
      });
    });

    it('should include notable references and cgspace_link for OICR', async () => {
      resultsUtilStub.indicatorId = IndicatorsEnum.OICR;
      find.mockResolvedValue([]);
      mockNotableRefs.find.mockResolvedValue([{ ref: 1 }]);
      const cgspaceLink = 'https://cgspace.cgiar.org/handle/10568/54321';
      oicrFindOne.mockResolvedValue({ cgspace_link: cgspaceLink });

      const out = await service.findPrincipalEvidence(6);

      expect(mockNotableRefs.find).toHaveBeenCalledWith(6);
      expect(oicrFindOne).toHaveBeenCalledWith({
        select: { cgspace_link: true },
        where: { result_id: 6, is_active: true },
      });
      expect(out).toEqual({
        evidence: [],
        notable_references: [{ ref: 1 }],
        cgspace_link: cgspaceLink,
      });
      resultsUtilStub.indicatorId = IndicatorsEnum.KNOWLEDGE_PRODUCT;
    });
  });
});
