import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { BilateralService } from './bilateral.service';
import { ResultRepository } from '../results/repositories/result.repository';
import { ResultPoolFundingAlignmentRepository } from './repositories/result-pool-funding-alignment.repository';
import { ResultPoolFundingIndicatorMappingRepository } from './repositories/result-pool-funding-indicator-mapping.repository';
import { ResultPoolFundingTocAlignmentRepository } from './repositories/result-pool-funding-toc-alignment.repository';
import { ServerGateway } from '../../tools/socket/server.gateway';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';
import { ClarisaScienceProgramsService } from '../../tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaCgiarEntitiesService } from '../../tools/clarisa/cgiar-entities/clarisa-cgiar-entities.service';
import { PrmsTocService } from '../../tools/prms-toc/prms-toc.service';
import { TocIntegrationService } from '../../tools/toc-integration/toc-integration.service';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import { ResultReviewHistory } from '../result-review-history/entities/result-review-history.entity';
import { TipTocMappingDto } from '../../tools/tip-integration/dto/response-year-tip.dto';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { TocResult } from '../../tools/toc-integration/dto/toc-integration.types';

// TIP pool-funding import (tip-kp-project-pool-funding T-02). Writes through
// persistAlignment with no STAR gate, no history and no socket. Indicator
// 4711 is the catalog integer for TIP's UUID and equals no other number here.
describe('BilateralService.importAlignmentFromTip', () => {
  let service: BilateralService;
  const findContext = jest.fn();
  const findActiveAlignment = jest.fn();
  const emit = jest.fn();
  const getTocResults = jest.fn();
  const findActiveTocRows = jest.fn();
  const upsertForSp = jest.fn();
  const deactivateForSps = jest.fn();
  let writes: Map<unknown, { update: jest.Mock; save: jest.Mock }>;
  let persistAlignment: jest.SpyInstance;
  let warn: jest.SpyInstance;

  const INDICATOR_UUID = 'f3706ba2-4c1e-4a7b-9d2e-111111111111';
  const DECOY_UUID = 'decoy-0000-0000-0000-000000000000';
  const INDICATOR_ID = 4711;
  const DECOY_INDICATOR_ID = 8802;
  const TOC_RESULT_ID = 7033;
  const RESULT_ID = 88001;
  const YEAR = 2026;
  const ACTOR = 42;
  const TIP_TITLE = 'HLO1.AOW1.IO1 Steer to impact';
  const TIP_DESCRIPTION = 'Share of households';
  const MISS_WARN = `TIP result ${RESULT_ID}: ToC result ${TOC_RESULT_ID} / indicator ${INDICATOR_UUID} not found (or multiple matches) in catalog SP01 ${YEAR}`;

  const realIndicator = {
    indicator_id: INDICATOR_ID,
    toc_result_indicator_id: INDICATOR_UUID,
    unit_messurament: 'households',
    indicator_description: 'catalog description must not be copied',
    targets: [{ target_date: String(YEAR), target_value: '15.5' }],
  };
  const decoyIndicator = {
    indicator_id: DECOY_INDICATOR_ID,
    toc_result_indicator_id: DECOY_UUID,
    unit_messurament: 'decoy-unit',
    indicator_description: 'decoy',
    targets: [{ target_date: String(YEAR), target_value: '99' }],
  };

  const outputCatalog = (): TocResult[] =>
    [
      {
        toc_result_id: TOC_RESULT_ID,
        title: 'Catalog title must not be copied',
        indicators: [realIndicator, decoyIndicator],
      },
    ] as TocResult[];

  const outcomeCatalog = (): TocResult[] =>
    [
      {
        toc_result_id: 8001,
        title: 'Decoy outcome',
        indicators: [decoyIndicator],
      },
    ] as TocResult[];

  const mapping = (
    overrides: Partial<TipTocMappingDto> = {},
  ): TipTocMappingDto => ({
    science_program_id: 'SP01',
    toc_result_id: TOC_RESULT_ID,
    toc_result_indicator_id: INDICATOR_UUID,
    result_title: TIP_TITLE,
    result_indicator_description: TIP_DESCRIPTION,
    target_contribution: 1,
    ...overrides,
  });

  const storedAlignment = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: 55,
    has_contribution: true,
    sp_roles: [{ sp_code: 'SP01', sp_role: 'PRIMARY' }],
    ...overrides,
  });

  const storedToc = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    sp_code: 'SP01',
    aligns_with_toc: true,
    level: 'OUTPUT',
    toc_result_id: TOC_RESULT_ID,
    indicator_id: INDICATOR_ID,
    quantitative_contribution: '1.23',
    toc_result_title: TIP_TITLE,
    indicator_description: TIP_DESCRIPTION,
    unit_messurament: 'households',
    target_value: '15.5',
    target_year: YEAR,
    ...overrides,
  });

  const repoFor = (entity: unknown) => {
    if (!writes.has(entity)) {
      writes.set(entity, {
        update: jest.fn(),
        save: jest.fn(async (value: unknown) =>
          Array.isArray(value) ? value : { id: 900, ...(value as object) },
        ),
      });
    }
    return writes.get(entity);
  };

  const transaction = jest.fn(async (work: (m: EntityManager) => unknown) =>
    work({ getRepository: repoFor } as unknown as EntityManager),
  );

  // Stands in for the real Promise.all batch. The production method does not
  // call it; the falsifier that swaps in getTocResultsForSps does.
  const getTocResultsForSps = jest.fn(
    async (sps: string[], levels: string[], year: number) => {
      const combos = sps.flatMap((sp) =>
        levels.map((level) => ({ sp, level })),
      );
      const results = await Promise.all(
        combos.map((combo) => getTocResults(combo.sp, combo.level, year)),
      );
      const out = new Map<string, unknown>();
      combos.forEach((combo, index) => {
        out.set(`${combo.sp}:${combo.level}`, results[index]);
      });
      return out;
    },
  );

  const importTip = (
    tipMapping: TipTocMappingDto = mapping(),
    resultId = RESULT_ID,
    memo?: Map<string, TocResult[] | null>,
  ) => service.importAlignmentFromTip(resultId, tipMapping, YEAR, ACTOR, memo);

  type PersistArgs = {
    resultId: number;
    previousAlignmentId: number | null;
    hasContribution: boolean;
    spCodes: string[];
    primarySpCode: string;
    tocUpserts: Array<{
      level: string | null;
      indicator_id: number | null;
      quantitative_contribution: number | null;
      toc_result_id: number | null;
      toc_result_title: string | null;
      indicator_description: string | null;
      unit_messurament: string | null;
      target_value: string | null;
      target_year: number | null;
      aligns_with_toc: boolean;
      sp_code: string;
      result_id: number;
    }>;
    tocSpCodesToDeactivate: string[];
    actorUserId: number | null;
  };

  const persisted = (): PersistArgs => {
    expect(persistAlignment).toHaveBeenCalledTimes(1);
    return persistAlignment.mock.calls[0][1] as PersistArgs;
  };

  beforeEach(async () => {
    writes = new Map();
    findActiveAlignment.mockResolvedValue(null);
    findActiveTocRows.mockResolvedValue([]);
    findContext.mockResolvedValue({
      indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
    });
    upsertForSp.mockResolvedValue({ id: 1 });
    deactivateForSps.mockResolvedValue(0);
    getTocResults.mockImplementation(async (_sp: string, level: string) => {
      if (level === 'OUTPUT') return outputCatalog();
      if (level === 'OUTCOME') return outcomeCatalog();
      return [];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralService,
        { provide: DataSource, useValue: { transaction } },
        {
          provide: ResultRepository,
          useValue: { findPoolFundingAlignmentContext: findContext },
        },
        {
          provide: ResultPoolFundingAlignmentRepository,
          useValue: { findActiveAlignmentByResultId: findActiveAlignment },
        },
        { provide: ResultPoolFundingIndicatorMappingRepository, useValue: {} },
        {
          provide: ResultPoolFundingTocAlignmentRepository,
          useValue: {
            findActiveByResultId: findActiveTocRows,
            upsertForSp,
            deactivateForSps,
          },
        },
        {
          provide: ServerGateway,
          useValue: { emitPoolFundingAlignmentChanged: emit },
        },
        { provide: CapacitySharingBilateralIndicatorTypeHandler, useValue: {} },
        {
          provide: InnovationDevelopmentBilateralIndicatorTypeHandler,
          useValue: {},
        },
        {
          provide: KnowledgeProductBilateralIndicatorTypeHandler,
          useValue: {},
        },
        { provide: NoopBilateralIndicatorTypeHandler, useValue: {} },
        { provide: PolicyChangeBilateralIndicatorTypeHandler, useValue: {} },
        { provide: ClarisaScienceProgramsService, useValue: {} },
        { provide: ClarisaProjectsService, useValue: {} },
        { provide: ClarisaCgiarEntitiesService, useValue: {} },
        { provide: PrmsTocService, useValue: {} },
        {
          provide: ReportingYearResolver,
          useValue: { resolve: jest.fn().mockResolvedValue(1999) },
        },
        {
          provide: TocIntegrationService,
          useValue: { getTocResults, getTocResultsForSps },
        },
        { provide: BilateralProjectMappingService, useValue: {} },
      ],
    }).compile();

    service = module.get(BilateralService);
    persistAlignment = jest.spyOn(
      service as unknown as {
        persistAlignment: (...args: unknown[]) => Promise<void>;
      },
      'persistAlignment',
    );
    warn = jest
      .spyOn(
        (service as unknown as { logger: { _warn: (message: string) => void } })
          .logger,
        '_warn',
      )
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    persistAlignment.mockRestore();
    warn.mockRestore();
    jest.clearAllMocks();
  });

  it('writes the R-TIP-003 field table from the OUTPUT catalog indicator 4711', async () => {
    await importTip();

    expect(persisted()).toEqual({
      resultId: RESULT_ID,
      previousAlignmentId: null,
      hasContribution: true,
      spCodes: ['SP01'],
      primarySpCode: 'SP01',
      tocSpCodesToDeactivate: [],
      actorUserId: ACTOR,
      now: expect.any(Date),
      tocUpserts: [
        {
          result_id: RESULT_ID,
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: TOC_RESULT_ID,
          indicator_id: INDICATOR_ID,
          quantitative_contribution: 1,
          toc_result_title: TIP_TITLE,
          indicator_description: TIP_DESCRIPTION,
          unit_messurament: 'households',
          target_value: '15.5',
          target_year: YEAR,
        },
      ],
    });
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTPUT', YEAR);
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTCOME', YEAR);
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'EOI', YEAR);
    expect(getTocResults).not.toHaveBeenCalledWith(
      'SP01',
      expect.anything(),
      1999,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(writes.has(ResultReviewHistory)).toBe(false);
    expect(emit).not.toHaveBeenCalled();
    expect(getTocResultsForSps).not.toHaveBeenCalled();
  });

  it('OUTPUT throws but OUTCOME holds the id → level OUTCOME and indicator 4711', async () => {
    getTocResults.mockImplementation(async (_sp: string, level: string) => {
      if (level === 'OUTPUT') throw new Error('lambda-toc down');
      if (level === 'OUTCOME') {
        return [
          {
            toc_result_id: TOC_RESULT_ID,
            indicators: [realIndicator],
          },
        ];
      }
      return [];
    });

    await importTip();

    const toc = persisted().tocUpserts[0];
    expect(toc.level).toBe('OUTCOME');
    expect(toc.indicator_id).toBe(INDICATOR_ID);
  });

  it('catalog down on a fresh result still writes TIP text with null catalog columns', async () => {
    getTocResults.mockRejectedValue(new Error('lambda-toc down'));

    await expect(importTip()).resolves.toBeUndefined();

    const toc = persisted().tocUpserts[0];
    expect(toc.level).toBeNull();
    expect(toc.indicator_id).toBeNull();
    expect(toc.unit_messurament).toBeNull();
    expect(toc.target_value).toBeNull();
    expect(toc.target_year).toBeNull();
    expect(toc.toc_result_id).toBe(TOC_RESULT_ID);
    expect(toc.toc_result_title).toBe(TIP_TITLE);
    expect(toc.indicator_description).toBe(TIP_DESCRIPTION);
    expect(toc.aligns_with_toc).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('catalog down on a resolved row with the same toc_result_id keeps indicator_id 4711', async () => {
    getTocResults.mockRejectedValue(new Error('lambda-toc down'));
    findActiveAlignment.mockResolvedValue(storedAlignment());
    findActiveTocRows.mockResolvedValue([
      storedToc({ toc_result_title: 'OLD TITLE' }),
    ]);

    await importTip();

    const toc = persisted().tocUpserts[0];
    expect(toc.indicator_id).toBe(4711);
    expect(toc.level).toBe('OUTPUT');
    expect(toc.unit_messurament).toBe('households');
    expect(toc.target_value).toBe('15.5');
    expect(toc.target_year).toBe(YEAR);
    expect(toc.toc_result_title).toBe(TIP_TITLE);
    expect(warn).not.toHaveBeenCalled();
  });

  it('OUTPUT throws and a later level lists the id without the UUID keeps the resolved OUTPUT row', async () => {
    getTocResults.mockImplementation(async (_sp: string, level: string) => {
      if (level === 'OUTPUT') throw new Error('lambda-toc down');
      if (level === 'OUTCOME') {
        return [
          {
            toc_result_id: TOC_RESULT_ID,
            indicators: [decoyIndicator],
          },
        ];
      }
      return [];
    });
    findActiveAlignment.mockResolvedValue(storedAlignment());
    findActiveTocRows.mockResolvedValue([
      storedToc({ toc_result_title: 'OLD TITLE' }),
    ]);

    await importTip();

    const toc = persisted().tocUpserts[0];
    expect(toc.level).toBe('OUTPUT');
    expect(toc.indicator_id).toBe(4711);
    expect(toc.unit_messurament).toBe('households');
    expect(toc.target_value).toBe('15.5');
    expect(toc.target_year).toBe(YEAR);
  });

  it('an unresolved stored row does not hide a later-level match', async () => {
    getTocResults.mockImplementation(async (_sp: string, level: string) => {
      if (level === 'OUTPUT') throw new Error('lambda-toc down');
      if (level === 'OUTCOME') {
        return [
          {
            toc_result_id: TOC_RESULT_ID,
            indicators: [realIndicator],
          },
        ];
      }
      return [];
    });
    findActiveAlignment.mockResolvedValue(storedAlignment());
    findActiveTocRows.mockResolvedValue([
      storedToc({
        level: null,
        indicator_id: null,
        unit_messurament: null,
        target_value: null,
        target_year: null,
        quantitative_contribution: 1,
      }),
    ]);

    await importTip();

    const toc = persisted().tocUpserts[0];
    expect(toc.level).toBe('OUTCOME');
    expect(toc.indicator_id).toBe(4711);
  });

  it('a catalog answer with no match overwrites catalog columns with null and warns', async () => {
    getTocResults.mockResolvedValue([]);
    findActiveAlignment.mockResolvedValue(storedAlignment());
    findActiveTocRows.mockResolvedValue([storedToc()]);

    await importTip(mapping({ target_contribution: 9 }));

    const toc = persisted().tocUpserts[0];
    expect(toc.indicator_id).toBeNull();
    expect(toc.level).toBeNull();
    expect(toc.target_year).toBeNull();
    expect(warn).toHaveBeenCalledWith(MISS_WARN);
  });

  it('two catalog matches keep the first (OUTPUT) and warn', async () => {
    getTocResults.mockImplementation(async (_sp: string, level: string) => {
      if (level === 'OUTPUT') return outputCatalog();
      if (level === 'OUTCOME') {
        return [
          {
            toc_result_id: TOC_RESULT_ID,
            indicators: [
              { ...realIndicator, indicator_id: DECOY_INDICATOR_ID },
            ],
          },
        ];
      }
      return [];
    });

    await importTip();

    const toc = persisted().tocUpserts[0];
    expect(toc.level).toBe('OUTPUT');
    expect(toc.indicator_id).toBe(INDICATOR_ID);
    expect(warn).toHaveBeenCalledWith(MISS_WARN);
  });

  it("unchanged row (stored '1.23', incoming 1.234) → persistAlignment not called", async () => {
    findActiveAlignment.mockResolvedValue(storedAlignment());
    findActiveTocRows.mockResolvedValue([storedToc()]);

    await importTip(mapping({ target_contribution: 1.234 }));

    expect(persistAlignment).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('a changed SP deactivates the previous ToC row and alignment', async () => {
    findActiveAlignment.mockResolvedValue(
      storedAlignment({
        id: 77,
        sp_roles: [{ sp_code: 'SP02', sp_role: 'PRIMARY' }],
      }),
    );
    findActiveTocRows.mockResolvedValue([storedToc({ sp_code: 'SP02' })]);

    await importTip();

    const args = persisted();
    expect(args.previousAlignmentId).toBe(77);
    expect(args.tocSpCodesToDeactivate).toEqual(['SP02']);
    expect(args.spCodes).toEqual(['SP01']);
    expect(args.primarySpCode).toBe('SP01');
    expect(args.tocUpserts[0].sp_code).toBe('SP01');
  });

  it('persists OUTPUT for a knowledge product (indicator_id = KNOWLEDGE_PRODUCT)', async () => {
    findContext.mockResolvedValue({
      indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
    });

    await expect(importTip()).resolves.toBeUndefined();

    const toc = persisted().tocUpserts[0];
    expect(toc.level).toBe('OUTPUT');
    expect(toc.indicator_id).toBe(INDICATOR_ID);
  });

  it("target_contribution '2' is stored as 2 and 'x' as null", async () => {
    await importTip(mapping({ target_contribution: '2' }));
    expect(persisted().tocUpserts[0].quantitative_contribution).toBe(2);

    persistAlignment.mockClear();
    await importTip(mapping({ target_contribution: 'x' }));
    expect(persisted().tocUpserts[0].quantitative_contribution).toBeNull();
  });

  it('a shared memo fetches each (sp, level, year) once across two calls', async () => {
    const memo = new Map<string, TocResult[] | null>();

    await importTip(mapping(), RESULT_ID, memo);
    await importTip(mapping(), 88002, memo);

    expect(getTocResults).toHaveBeenCalledTimes(3);
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTPUT', YEAR);
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'OUTCOME', YEAR);
    expect(getTocResults).toHaveBeenCalledWith('SP01', 'EOI', YEAR);
  });
});
