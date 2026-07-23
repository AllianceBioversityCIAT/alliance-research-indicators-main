import {
  buildPortfolio2AlignmentPatch,
  enrichAlignmentLevers,
  enrichAlignmentSdgTargets,
  enrichPortfolio2Contracts,
  enrichResearchAreas,
  enrichResultSdgs,
  flattenAlignmentContract,
  normalizeContractLevers,
  normalizePortfolio2AlignmentGet
} from './portfolio-2-alignment.mapper';
import { GetAllianceAlignment } from '@shared/interfaces/get-alliance-alignment.interface';

describe('portfolio-2-alignment.mapper', () => {
  it('flattens nested agresso_contract data for display', () => {
    const flattened = flattenAlignmentContract({
      contract_id: 'uuid-1',
      is_primary: true,
      is_active: true,
      result_contract_id: 1,
      result_id: 1,
      contract_role_id: 1,
      agresso_contract: {
        agreement_id: 'A100',
        description: 'Nested project',
        project_lead_description: 'PI Name',
        start_date: '2024-01-01',
        endDateGlobal: '2025-01-01'
      }
    });

    expect(flattened.agreement_id).toBe('A100');
    expect(flattened.description).toBe('Nested project');
    expect(flattened.project_lead_description).toBe('PI Name');
  });

  it('enriches contracts from catalog and normalizes levers', () => {
    const enriched = enrichPortfolio2Contracts(
      [
        {
          contract_id: 'uuid-1',
          is_primary: true,
          is_active: true,
          result_contract_id: 1,
          result_id: 1,
          contract_role_id: 1,
          agresso_contract: {
            agreement_id: 'A100',
            description: 'Project 100'
          }
        } as never
      ],
      [
        {
          agreement_id: 'A100',
          description: 'Project 100',
          contract_id: 'A100',
          select_label: 'A100 - Project 100',
          project_lead_description: 'PI Name',
          start_date: '2024-01-01',
          endDateGlobal: '2025-01-01',
          lever: 'Lever Name',
          leverUrl: 'lever.png',
          is_active: true,
          center_amount: '',
          center_amount_usd: '',
          client: '',
          contract_status: null,
          department: null,
          departmentId: null,
          division: null,
          divisionId: null,
          donor: null,
          is_science_program: false,
          donor_reference: null,
          endDatefinance: '',
          end_date: null,
          entity: null,
          extension_date: null,
          funding_type: null,
          grant_amount: '',
          lever_id: 1,
          grant_amount_usd: '',
          project: null,
          projectDescription: null,
          short_title: '',
          ubwClientDescription: '',
          unit: null,
          unitId: null,
          office: null,
          officeId: null,
          display_label: ''
        }
      ]
    );

    expect(enriched[0].agreement_id).toBe('A100');
    expect(enriched[0].contract_id).toBe('A100');
    expect(enriched[0].select_label).toBe('A100 - Project 100');
    expect(enriched[0].levers?.full_name).toBe('Lever Name');
    expect(normalizeContractLevers({ lever: 'Lever Name', leverUrl: 'lever.png', lever_id: 1 } as never)?.lever_url).toBe('lever.png');
  });

  it('normalizes portfolio 2 GET data for multiselect bindings', () => {
    const normalized = normalizePortfolio2AlignmentGet({
      contracts: [{ contract_id: 'abc', is_primary: true } as never],
      result_sdgs: [{ clarisa_sdg_id: 2 } as never],
      research_areas: [{ lever_id: '42', full_name: 'Area 42' } as never],
      strategic_objectives: [{ strategic_objective_id: 3, name: 'SO 3' } as never],
      impact_outcomes: [{ impact_outcome_id: 5, name: 'IO 5' } as never],
      primary_levers: [{ lever_id: 1 } as never],
      contributor_levers: [{ lever_id: 2 } as never]
    });

    expect(normalized.primary_levers).toEqual([]);
    expect(normalized.contributor_levers).toEqual([]);
    expect(normalized.research_areas[0].lever_id).toBe(42);
    expect(normalized.research_areas[0].id).toBe(42);
    expect(normalized.strategic_objectives[0].id).toBe(3);
    expect(normalized.impact_outcomes[0].id).toBe(5);
    expect(normalized.result_sdgs[0].id).toBe(2);
  });

  it('normalizes real portfolio 2 GET payload with link-only contracts and empty collections', () => {
    const normalized = normalizePortfolio2AlignmentGet(
      {
        contracts: [
          {
            created_at: '2026-01-21T13:06:55.836Z',
            updated_at: '2026-06-30T21:38:49.000Z',
            is_active: true,
            result_contract_id: 11085,
            result_id: 8579,
            contract_id: 'A1048',
            contract_role_id: 1,
            is_primary: true
          } as never
        ],
        result_sdgs: [],
        research_areas: [],
        strategic_objectives: [],
        impact_outcomes: []
      },
      {
        contracts: [
          {
            agreement_id: 'A1048',
            description: 'Project A1048',
            contract_id: 'A1048',
            select_label: 'A1048 - Project A1048',
            project_lead_description: 'Lead',
            start_date: '2024-01-01',
            endDateGlobal: '2025-01-01',
            is_active: true,
            center_amount: '',
            center_amount_usd: '',
            client: '',
            contract_status: null,
            department: null,
            departmentId: null,
            division: null,
            divisionId: null,
            donor: null,
            is_science_program: false,
            donor_reference: null,
            endDatefinance: '',
            end_date: null,
            entity: null,
            extension_date: null,
            funding_type: null,
            grant_amount: '',
            lever_id: 1,
            grant_amount_usd: '',
            project: null,
            projectDescription: null,
            short_title: '',
            ubwClientDescription: '',
            unit: null,
            unitId: null,
            office: null,
            officeId: null,
            display_label: ''
          }
        ]
      }
    );

    expect(normalized.contracts[0].agreement_id).toBe('A1048');
    expect(normalized.contracts[0].description).toBe('Project A1048');
    expect(normalized.contracts[0].select_label).toBe('A1048 - Project A1048');
    expect(normalized.contracts[0].is_primary).toBe(true);
    expect(normalized.result_sdgs).toEqual([]);
    expect(normalized.research_areas).toEqual([]);
    expect(normalized.strategic_objectives).toEqual([]);
    expect(normalized.impact_outcomes).toEqual([]);
  });

  it('uses contract_id as agreement_id when catalog match is unavailable', () => {
    const enriched = enrichPortfolio2Contracts(
      [
        {
          contract_id: 'A1048',
          is_primary: true,
          is_active: true,
          result_contract_id: 11085,
          result_id: 8579,
          contract_role_id: 1
        } as never
      ],
      []
    );

    expect(enriched[0].agreement_id).toBe('A1048');
    expect(enriched[0].contract_id).toBe('A1048');
    expect(enriched[0].select_label).toBe('A1048');
  });

  it('builds portfolio 2 PATCH payload without legacy lever fields', () => {
    const body: GetAllianceAlignment = {
      contracts: [
        { contract_id: 'a1', is_primary: true } as never,
        { contract_id: 'b2', is_primary: false } as never
      ],
      result_sdgs: [{ id: 2, clarisa_sdg_id: 2 } as never],
      primary_levers: [],
      contributor_levers: [],
      research_areas: [{ id: 10, lever_id: 10 } as never],
      strategic_objectives: [{ id: 1, name: 'SO 1' }],
      impact_outcomes: [{ id: 5, name: 'IO 5' }]
    };

    expect(buildPortfolio2AlignmentPatch(body, true)).toEqual({
      contracts: [
        { contract_id: 'a1', is_primary: true },
        { contract_id: 'b2', is_primary: false }
      ],
      result_sdgs: [{ clarisa_sdg_id: 2 }],
      research_areas: [{ lever_id: '10' }],
      strategic_objectives: [{ strategic_objective_id: 1 }],
      impact_outcomes: [{ impact_outcome_id: 5 }]
    });
  });

  it('omits impact_outcomes when indicator does not use them', () => {
    const body: GetAllianceAlignment = {
      contracts: [],
      result_sdgs: [],
      primary_levers: [],
      contributor_levers: [],
      strategic_objectives: [],
      impact_outcomes: [{ id: 5, name: 'IO 5' }]
    };

    expect(buildPortfolio2AlignmentPatch(body, false).impact_outcomes).toBeUndefined();
    expect(buildPortfolio2AlignmentPatch(body, false)).not.toHaveProperty('impact_outcomes');
  });

  it('includes empty impact_outcomes when indicator uses them but none are selected', () => {
    const body: GetAllianceAlignment = {
      contracts: [],
      result_sdgs: [],
      primary_levers: [],
      contributor_levers: [],
      strategic_objectives: [],
      impact_outcomes: []
    };

    expect(buildPortfolio2AlignmentPatch(body, true).impact_outcomes).toEqual([]);
  });

  it('sends empty result_sdgs only when explicitly excluded (OICR rule)', () => {
    const body: GetAllianceAlignment = {
      contracts: [],
      result_sdgs: [{ id: 2, clarisa_sdg_id: 2 } as never],
      primary_levers: [],
      contributor_levers: [],
      strategic_objectives: [],
      impact_outcomes: []
    };

    expect(buildPortfolio2AlignmentPatch(body, false, false).result_sdgs).toEqual([]);
    expect(buildPortfolio2AlignmentPatch(body, false, true).result_sdgs).toEqual([{ clarisa_sdg_id: 2 }]);
  });

  it('enriches alignment levers from catalog while preserving saved fields', () => {
    const enriched = enrichAlignmentLevers(
      [
        {
          lever_id: 3,
          result_lever_id: 1,
          result_id: 1,
          lever_role_id: 1,
          is_primary: true,
          custom_lever_name: 'Should stay'
        } as never
      ],
      [{ id: 3, lever_id: 3, short_name: 'Catalog', other_names: 'Catalog full', full_name: 'Catalog', icon: 'icon.png' } as never]
    );

    expect(enriched[0].short_name).toBe('Catalog');
    expect(enriched[0].icon).toBe('icon.png');
    expect(enriched[0].custom_lever_name).toBe('Should stay');
  });

  it('defaults Other lever labels when catalog does not include lever 9', () => {
    const enriched = enrichAlignmentLevers(
      [{ lever_id: 9, result_lever_id: 1, result_id: 1, lever_role_id: 1, is_primary: true } as never],
      [{ id: 1, lever_id: 1, short_name: 'Lever 1', full_name: 'Lever 1', other_names: '' } as never]
    );

    expect(enriched[0].short_name).toBe('Other');
    expect(enriched[0].other_names).toBe('Other');
  });

  it('enriches alignment SDG targets from catalog while preserving saved fields', () => {
    const enriched = enrichAlignmentSdgTargets(
      [
        {
          sdg_target_id: 12,
          sdg_target_code: '2.3',
          sdg_target: 'Saved label',
          clarisa_sdg: { id: 2, icon: 'saved.png' }
        }
      ],
      [
        {
          id: 12,
          sdg_target_id: 12,
          sdg_target_code: '2.3',
          sdg_target: 'Catalog label',
          select_label: '2.3 — Catalog label',
          clarisa_sdg: { id: 2, icon: 'catalog.png' }
        } as never
      ]
    );

    expect(enriched[0].sdg_target).toBe('Saved label');
    expect(enriched[0].clarisa_sdg?.icon).toBe('saved.png');
    expect(enriched[0].select_label).toBe('2.3 — Catalog label');
  });

  it('returns research areas unchanged when catalog has no match', () => {
    const areas = [{ lever_id: 99, full_name: 'Unmatched' } as never];
    expect(enrichResearchAreas(areas, [{ lever_id: 1, full_name: 'Other' } as never])).toEqual([
      { lever_id: 99, full_name: 'Unmatched', id: 99 }
    ]);
  });

  it('enriches research areas from catalog when a match exists', () => {
    const enriched = enrichResearchAreas(
      [{ lever_id: 5, full_name: 'Saved name' } as never],
      [{ id: 5, lever_id: 5, full_name: 'Catalog name', short_name: 'Cat' } as never]
    );
    expect(enriched[0].full_name).toBe('Saved name');
    expect(enriched[0].short_name).toBe('Cat');
  });

  it('returns SDG targets without catalog enrichment and skips invalid entries', () => {
    expect(enrichAlignmentSdgTargets(null)).toEqual([]);
    expect(enrichAlignmentSdgTargets([7, { sdg_target_id: 8 }, { id: 'bad' }])).toEqual([
      { sdg_target_id: 7 },
      { sdg_target_id: 8 }
    ]);
  });

  it('filters invalid SDGs and enriches valid ones from catalog', () => {
    const enriched = enrichResultSdgs(
      [{ clarisa_sdg_id: 0 } as never, { clarisa_sdg_id: 3 } as never],
      [{ id: 3, clarisa_sdg_id: 3, sdg_id: 3 } as never]
    );
    expect(enriched).toHaveLength(1);
    expect(enriched[0].id).toBe(3);
    expect(enriched[0].clarisa_sdg_id).toBe(3);
  });

  it('normalizes contract levers from object, array, and fallback lever fields', () => {
    const objectLevers = { id: 1, full_name: 'Obj', short_name: 'O', other_names: '', lever_url: 'o.png' };
    expect(normalizeContractLevers({ levers: objectLevers } as never)).toBe(objectLevers);
    expect(normalizeContractLevers({ levers: [objectLevers] } as never)).toBe(objectLevers);
    expect(
      normalizeContractLevers({
        leverUrl: 'only-url.png',
        lever_id: 2
      } as never)
    ).toEqual({
      id: 2,
      full_name: 'Not available',
      short_name: '',
      other_names: '',
      lever_url: 'only-url.png'
    });
    expect(
      normalizeContractLevers({
        lever: { name: 'Full', short_name: 'Short' },
        lever_url: 'x.png',
        lever_id: 3
      } as never)?.full_name
    ).toBe('Full');
    expect(normalizeContractLevers({ lever: {} as never, lever_url: 'x.png' } as never)?.full_name).toBe('Not available');
    expect(normalizeContractLevers({ lever: { name: 'Only name' } } as never)?.short_name).toBe('Only name');
  });

  it('enriches contracts by agreement_id without catalog and handles empty identifiers', () => {
    const byAgreement = enrichPortfolio2Contracts(
      [{ agreement_id: 'A200', description: 'Desc 200', is_primary: true } as never],
      []
    );
    expect(byAgreement[0].contract_id).toBe('A200');
    expect(byAgreement[0].select_label).toBe('A200 - Desc 200');

    const noIds = enrichPortfolio2Contracts([{ is_primary: false } as never], []);
    expect(noIds[0].contract_id).toBeUndefined();
    expect(noIds[0].levers).toBeUndefined();
  });

  it('returns lever unchanged when catalog has no match for non-Other lever', () => {
    const enriched = enrichAlignmentLevers(
      [{ lever_id: 7, result_lever_id: 1, result_id: 1, lever_role_id: 1, is_primary: true } as never],
      []
    );
    expect(enriched[0].lever_id).toBe(7);
    expect(enriched[0].short_name).toBeUndefined();
  });

  it('filters empty research areas and omits contracts without contract_id in PATCH', () => {
    expect(normalizePortfolio2AlignmentGet({ research_areas: [{ lever_id: '' } as never] }).research_areas).toEqual([]);
    const patch = buildPortfolio2AlignmentPatch(
      {
        contracts: [{ contract_id: '', is_primary: false } as never, { contract_id: 'ok', is_primary: true } as never],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: [],
        strategic_objectives: [],
        impact_outcomes: []
      },
      false
    );
    expect(patch.contracts).toEqual([{ contract_id: 'ok', is_primary: true }]);
  });

  it('covers SDG, research area, lever, and contract normalization branches', () => {
    expect(
      normalizePortfolio2AlignmentGet(
        {
          result_sdgs: [{ sdg_id: 11 } as never],
          research_areas: [{ id: 8, full_name: 'By id' } as never],
          strategic_objectives: [{ strategic_objective_id: 0 } as never],
          impact_outcomes: [{ impact_outcome_id: 6, name: 'IO' } as never],
          contracts: [
            {
              agreement_id: 'A300',
              is_primary: false,
              levers: { id: 1, full_name: 'L', short_name: 'L', other_names: '', lever_url: '' }
            } as never
          ]
        },
        {
          sdgs: [{ id: 11, clarisa_sdg_id: 11 } as never],
          levers: [{ id: 8, lever_id: 8, full_name: 'Catalog 8', short_name: 'C8' } as never],
          strategicObjectives: [{ id: 2, name: 'SO 2' }],
          impactOutcomes: [{ id: 6, name: 'Catalog IO' }],
          contracts: [
            {
              agreement_id: 'A300',
              contract_id: 'A300',
              description: 'Project 300',
              select_label: 'A300 - Project 300'
            } as never
          ]
        }
      )
    ).toMatchObject({
      result_sdgs: [{ id: 11, clarisa_sdg_id: 11 }],
      research_areas: [{ lever_id: 8, full_name: 'By id', short_name: 'C8' }],
      strategic_objectives: [],
      impact_outcomes: [{ id: 6, name: 'IO' }],
      contracts: [{ agreement_id: 'A300', select_label: 'A300 - Project 300' }]
    });

    const flattened = flattenAlignmentContract({
      contract_id: 'x',
      agresso_contract: { agreement_id: 'A1', end_date: '2025-12-31', contract_status: 'Active' }
    } as never);
    expect(flattened.end_date).toBe('2025-12-31');
    expect(flattened.contract_status).toBe('Active');

    const byAgreementNoDesc = enrichPortfolio2Contracts([{ agreement_id: 'A400' } as never], []);
    expect(byAgreementNoDesc[0].select_label).toBe('A400');

    const catalogSelectLabel = enrichPortfolio2Contracts(
      [{ agreement_id: 'A500', description: 'Five' } as never],
      [{ agreement_id: 'A500', contract_id: 'A500' } as never]
    );
    expect(catalogSelectLabel[0].select_label).toBe('A500 - Five');

    const leverFromCatalog = enrichAlignmentLevers(
      [{ lever_id: 2, result_lever_id: 1, result_id: 1, lever_role_id: 1, is_primary: true } as never],
      [{ id: 2, lever_id: 2, short_name: 'Cat', other_names: 'Cat full', lever_url: 'from-url.png' } as never]
    );
    expect(leverFromCatalog[0].icon).toBe('from-url.png');

    expect(enrichAlignmentSdgTargets([{ sdg_target_id: 9, select_label: 'Saved' }], [{ id: 9, sdg_target_id: 9 }])).toEqual([
      { id: 9, sdg_target_id: 9, select_label: 'Saved' }
    ]);

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [{ sdg_id: 4 } as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [{ id: 15 } as never],
          strategic_objectives: [{ strategic_objective_id: 2 } as never],
          impact_outcomes: [{ impact_outcome_id: 7 } as never]
        },
        true
      )
    ).toEqual({
      contracts: [],
      result_sdgs: [{ clarisa_sdg_id: 4 }],
      research_areas: [{ lever_id: '15' }],
      strategic_objectives: [{ strategic_objective_id: 2 }],
      impact_outcomes: [{ impact_outcome_id: 7 }]
    });
  });

  it('covers remaining normalization and patch branches', () => {
    expect(normalizePortfolio2AlignmentGet(undefined).contracts).toEqual([]);
    expect(
      normalizePortfolio2AlignmentGet({
        result_sdgs: [{ clarisa_sdg_id: 12 } as never],
        strategic_objectives: [{ id: 4, name: 'From id' }],
        impact_outcomes: [{ id: 0 }]
      }, {
        sdgs: [{ clarisa_sdg_id: 12, id: 12 } as never],
        strategicObjectives: [{ id: 4, name: 'Catalog SO' }]
      })
    ).toMatchObject({
      result_sdgs: [{ id: 12, clarisa_sdg_id: 12 }],
      strategic_objectives: [{ id: 4, name: 'From id' }]
    });

    expect(enrichResearchAreas(undefined)).toEqual([]);
    expect(
      enrichResearchAreas([{ id: 6, full_name: 'Area' } as never], [{ id: 6, full_name: 'Cat full', short_name: 'Cat' } as never])[0]
    ).toMatchObject({ lever_id: 6, full_name: 'Area', short_name: 'Cat' });

    expect(enrichAlignmentLevers(undefined)).toEqual([]);
    expect(
      enrichAlignmentLevers(
        [{ lever_id: 4, icon: 'saved.png', result_lever_id: 1, result_id: 1, lever_role_id: 1, is_primary: true } as never],
        [{ id: 4, short_name: 'Cat', other_names: 'Cat', icon: 'cat.png' } as never]
      )[0].icon
    ).toBe('saved.png');

    expect(enrichAlignmentSdgTargets([{ id: 10 }])).toEqual([{ id: 10, sdg_target_id: 10 }]);
    expect(enrichResultSdgs([{ sdg_id: 13 } as never], [{ clarisa_sdg_id: 13, id: 14 } as never])[0].sdg_id).toBe(13);

    const flattenedRestAgreement = flattenAlignmentContract({
      agreement_id: 'REST',
      agresso_contract: { description: 'Nested only' }
    } as never);
    expect(flattenedRestAgreement.agreement_id).toBe('REST');

    const catalogFromFlattened = enrichPortfolio2Contracts(
      [{ agreement_id: 'A600', description: 'Six', is_primary: true } as never],
      [{ contract_id: 'A600', agreement_id: 'A600' } as never]
    );
    expect(catalogFromFlattened[0].select_label).toBe('A600 - Six');
    expect(catalogFromFlattened[0].is_primary).toBe(true);

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: undefined as never,
          result_sdgs: [{ id: 20, clarisa_sdg_id: 20 } as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: undefined as never,
          strategic_objectives: undefined as never,
          impact_outcomes: undefined as never
        },
        false,
        true
      )
    ).toEqual({
      contracts: [],
      result_sdgs: [{ clarisa_sdg_id: 20 }],
      research_areas: [],
      strategic_objectives: []
    });

    expect(enrichAlignmentSdgTargets([0, { sdg_target_id: 11 }])).toEqual([{ sdg_target_id: 11 }]);
  });

  it('covers optional chaining fallbacks across mapper helpers', () => {
    expect(
      normalizePortfolio2AlignmentGet({
        result_sdgs: [{ sdg_id: 21 } as never],
        strategic_objectives: [{ strategic_objective_id: 9 }],
        impact_outcomes: [{ impact_outcome_id: 8 }]
      }, {
        sdgs: [{ clarisa_sdg_id: 21, id: 21 } as never],
        strategicObjectives: [{ id: 9, name: 'Catalog name' }],
        impactOutcomes: [{ id: 8, name: 'Catalog IO' }]
      })
    ).toMatchObject({
      result_sdgs: [{ id: 21, clarisa_sdg_id: 21, sdg_id: 21 }],
      strategic_objectives: [{ id: 9, name: 'Catalog name' }],
      impact_outcomes: [{ id: 8, name: 'Catalog IO' }]
    });

    expect(
      enrichResearchAreas(
        [{ id: 17, full_name: undefined, short_name: undefined } as never],
        [{ lever_id: 17, full_name: 'Catalog full', short_name: 'Catalog short' } as never]
      )[0]
    ).toMatchObject({ full_name: 'Catalog full', short_name: 'Catalog short' });

    expect(enrichAlignmentSdgTargets([{ sdg_target_id: 14 }], [{ id: 14, sdg_target_id: 14, select_label: '14' }])).toEqual([
      { id: 14, sdg_target_id: 14, select_label: '14' }
    ]);

    const fromCatalogAgreement = enrichPortfolio2Contracts(
      [{ agreement_id: 'A700', description: 'Seven' } as never],
      [{ agreement_id: 'A700' } as never]
    );
    expect(fromCatalogAgreement[0].contract_id).toBe('A700');
    expect(fromCatalogAgreement[0].select_label).toBe('A700 - Seven');

    const fromCatalogNoDescription = enrichPortfolio2Contracts(
      [{ agreement_id: 'A800' } as never],
      [{ agreement_id: 'A800' } as never]
    );
    expect(fromCatalogNoDescription[0].select_label).toBe('A800');

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [{ id: 25 } as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: [{ id: 9 }]
        },
        true
      ).impact_outcomes
    ).toEqual([{ impact_outcome_id: 9 }]);
  });

  it('covers final optional-coalescing branches in mapper helpers', () => {
    expect(
      normalizePortfolio2AlignmentGet({
        result_sdgs: [{ clarisa_sdg_id: 31 } as never]
      }, {
        sdgs: [{ id: 31, clarisa_sdg_id: 31 } as never]
      }).result_sdgs[0]
    ).toMatchObject({ id: 31, clarisa_sdg_id: 31, sdg_id: 31 });

    expect(
      enrichResearchAreas(
        [{ lever_id: 18, id: 19, full_name: 'Area' } as never],
        [{ id: 18, full_name: 'Catalog', short_name: 'C' } as never]
      )[0].lever_id
    ).toBe(18);

    expect(enrichAlignmentSdgTargets([{ id: 16 }])).toEqual([{ id: 16, sdg_target_id: 16 }]);

    expect(
      enrichResultSdgs([{ clarisa_sdg_id: 32 } as never], [{ id: 32, clarisa_sdg_id: 32 } as never])[0]
    ).toMatchObject({ id: 32, clarisa_sdg_id: 32 });

    expect(
      normalizePortfolio2AlignmentGet({
        strategic_objectives: [{ strategic_objective_id: 11 }],
        impact_outcomes: [{ impact_outcome_id: 12 }]
      }, {
        strategicObjectives: [{ id: 11, name: 'SO catalog' }],
        impactOutcomes: [{ id: 12, name: 'IO catalog' }]
      })
    ).toMatchObject({
      strategic_objectives: [{ id: 11, name: 'SO catalog' }],
      impact_outcomes: [{ id: 12, name: 'IO catalog' }]
    });

    const catalogUsesFlattenedAgreement = enrichPortfolio2Contracts(
      [{ agreement_id: 'A900', description: 'Nine' } as never],
      [{ contract_id: 'A900' } as never]
    );
    expect(catalogUsesFlattenedAgreement[0].agreement_id).toBe('A900');

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [{ clarisa_sdg_id: 40 } as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: [{ impact_outcome_id: 13 }]
        },
        true
      )
    ).toMatchObject({
      result_sdgs: [{ clarisa_sdg_id: 40 }],
      impact_outcomes: [{ impact_outcome_id: 13 }]
    });
  });

  it('hits remaining right-hand coalescing branches', () => {
    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [{ sdg_id: 55 } as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: [{ id: 14 }]
        },
        true
      )
    ).toMatchObject({
      result_sdgs: [{ clarisa_sdg_id: 55 }],
      impact_outcomes: [{ impact_outcome_id: 14 }]
    });

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [{ id: 26 } as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: []
        },
        false
      ).result_sdgs
    ).toEqual([{ clarisa_sdg_id: 26 }]);

    expect(enrichResultSdgs([{ clarisa_sdg_id: 33 } as never])).toEqual([
      expect.objectContaining({ id: 33, clarisa_sdg_id: 33 })
    ]);

    expect(
      enrichResultSdgs([{ id: 35, sdg_id: 77 } as never], [{ id: 35, clarisa_sdg_id: 88 } as never])[0]
    ).toMatchObject({ clarisa_sdg_id: 35, sdg_id: 77 });

    expect(enrichAlignmentSdgTargets([{ sdg_target_id: 24 }])).toEqual([{ sdg_target_id: 24 }]);
    expect(enrichAlignmentSdgTargets([{ sdg_target_id: 23 }], [{ id: 23 } as never])).toEqual([
      { id: 23, sdg_target_id: 23 }
    ]);

    expect(
      enrichResearchAreas([{ lever_id: 27 } as never], [{ id: 27, full_name: 'Full', short_name: 'Short' } as never])[0]
    ).toMatchObject({ lever_id: 27, short_name: 'Short' });

    expect(
      normalizePortfolio2AlignmentGet(
        { strategic_objectives: [{ strategic_objective_id: 15 }] },
        { strategicObjectives: [{ id: 15, name: 'Catalog only' }] }
      ).strategic_objectives[0].name
    ).toBe('Catalog only');

    expect(
      enrichPortfolio2Contracts([{ agreement_id: 'A950', description: 'Nine fifty' } as never], [{ contract_id: 'A950' } as never])[0]
        .agreement_id
    ).toBe('A950');

    expect(normalizePortfolio2AlignmentGet({ result_sdgs: [{} as never] }).result_sdgs).toEqual([]);
    expect(enrichAlignmentSdgTargets([{ id: '24' }])).toEqual([{ id: '24', sdg_target_id: 24 }]);
    expect(
      normalizePortfolio2AlignmentGet({ strategic_objectives: [{ strategic_objective_id: 99 }] }).strategic_objectives[0].name
    ).toBe('');
    expect(
      enrichPortfolio2Contracts([{ contract_id: 'C1' } as never], [{ contract_id: 'C1' } as never])[0].agreement_id
    ).toBe('');

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: [{ id: 88 } as never]
        },
        true
      ).impact_outcomes
    ).toEqual([{ impact_outcome_id: 88 }]);
  });

  it('maps impact_outcome_id from item id and parses string SDG target ids', () => {
    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [{} as never],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: [{ id: 99 } as never]
        },
        true
      )
    ).toMatchObject({
      result_sdgs: [],
      impact_outcomes: [{ impact_outcome_id: 99 }]
    });

    expect(enrichAlignmentSdgTargets([{ id: '24' }, { sdg_target_id: 25 }])).toEqual([
      { id: '24', sdg_target_id: 24 },
      { sdg_target_id: 25 }
    ]);

    expect(
      normalizePortfolio2AlignmentGet({ strategic_objectives: [{ strategic_objective_id: 77 }] }).strategic_objectives[0]
    ).toMatchObject({ id: 77, name: '' });

    expect(
      buildPortfolio2AlignmentPatch(
        {
          contracts: [],
          result_sdgs: [],
          primary_levers: [],
          contributor_levers: [],
          research_areas: [],
          strategic_objectives: [],
          impact_outcomes: undefined as never
        },
        true
      ).impact_outcomes
    ).toEqual([]);

    expect(enrichAlignmentSdgTargets([{ sdg_target_id: '27' }])).toEqual([{ sdg_target_id: 27 }]);
    expect(enrichAlignmentSdgTargets([{ id: '' }, { id: 'not-a-number' }])).toEqual([]);
  });

  describe('defensive coalescing branches', () => {
    const originalMap = Array.prototype.map;
    let mapSpy: jest.SpyInstance;

    afterEach(() => {
      mapSpy?.mockRestore();
    });

    it('covers enrichResultSdgs nullish id and catalog fallbacks', () => {
      let mapCall = 0;
      mapSpy = jest.spyOn(Array.prototype, 'map').mockImplementation(function <T, U>(this: T[], fn: (value: T, index: number, array: T[]) => U) {
        mapCall += 1;
        const source =
          mapCall === 2
            ? ([{ id: 61, clarisa_sdg_id: undefined, sdg_id: undefined }] as unknown as T[])
            : this;
        return originalMap.call(source, fn);
      });

      expect(
        enrichResultSdgs([{ clarisa_sdg_id: 61 } as never], [{ id: 61, clarisa_sdg_id: 99, sdg_id: 100 } as never])[0]
      ).toMatchObject({
        id: 61,
        clarisa_sdg_id: 99,
        sdg_id: 61
      });
    });

    it('covers enrichResultSdgs clarisa_sdg_id fallback when id is nullish', () => {
      let mapCall = 0;
      mapSpy = jest.spyOn(Array.prototype, 'map').mockImplementation(function <T, U>(this: T[], fn: (value: T, index: number, array: T[]) => U) {
        mapCall += 1;
        const source =
          mapCall === 2
            ? ([{ id: undefined, clarisa_sdg_id: 61, sdg_id: undefined }] as unknown as T[])
            : this;
        return originalMap.call(source, fn);
      });

      expect(enrichResultSdgs([{ clarisa_sdg_id: 61 } as never])[0]).toMatchObject({
        id: 61,
        clarisa_sdg_id: 61,
        sdg_id: 61
      });
    });

    it('covers buildPortfolio2AlignmentPatch clarisa_sdg_id fallback to id', () => {
      let mapCall = 0;
      mapSpy = jest.spyOn(Array.prototype, 'map').mockImplementation(function <T, U>(this: T[], fn: (value: T, index: number, array: T[]) => U) {
        mapCall += 1;
        const source =
          mapCall === 3
            ? ([{ id: 72, clarisa_sdg_id: undefined }] as unknown as T[])
            : this;
        return originalMap.call(source, fn);
      });

      expect(
        buildPortfolio2AlignmentPatch(
          {
            contracts: [],
            result_sdgs: [{ id: 72 } as never],
            primary_levers: [],
            contributor_levers: [],
            research_areas: [],
            strategic_objectives: [],
            impact_outcomes: []
          },
          true
        ).result_sdgs
      ).toEqual([{ clarisa_sdg_id: 72 }]);
    });

    it('covers enrichResearchAreas lever id fallbacks when lever_id is missing', () => {
      let mapCall = 0;
      mapSpy = jest.spyOn(Array.prototype, 'map').mockImplementation(function <T, U>(this: T[], fn: (value: T, index: number, array: T[]) => U) {
        mapCall += 1;
        const source =
          mapCall === 2
            ? ([{ id: 41, lever_id: undefined, full_name: 'Area', short_name: 'A' }] as unknown as T[])
            : this;
        return originalMap.call(source, fn);
      });

      expect(
        enrichResearchAreas([{ id: 41, full_name: 'Area', short_name: 'A' } as never], [{ id: 41, full_name: 'Catalog', short_name: 'C' } as never])[0]
      ).toMatchObject({
        id: 41,
        lever_id: 41,
        full_name: 'Area',
        short_name: 'A'
      });
    });

    it('covers enrichResultSdgs sdgId fallback for clarisa_sdg_id', () => {
      let intercepted = false;
      mapSpy = jest.spyOn(Array.prototype, 'map').mockImplementation(function <T, U>(this: T[], fn: (value: T, index: number, array: T[]) => U) {
        const shouldIntercept =
          !intercepted &&
          this.length > 0 &&
          typeof (this[0] as { clarisa_sdg_id?: number }).clarisa_sdg_id === 'number' &&
          typeof (this[0] as { id?: number }).id === 'number';
        if (shouldIntercept) {
          intercepted = true;
          return originalMap.call(
            [{ id: 61, clarisa_sdg_id: undefined, sdg_id: undefined }] as unknown as T[],
            fn
          );
        }
        return originalMap.call(this, fn);
      });

      expect(enrichResultSdgs([{ id: 61 } as never])[0]).toMatchObject({
        id: 61,
        clarisa_sdg_id: 61,
        sdg_id: 61
      });
    });

    it('covers enrichResearchAreas match and area lever id chain fallbacks', () => {
      const originalFind = Array.prototype.find;
      let findSpy: jest.SpyInstance;
      let intercepted = false;

      mapSpy = jest.spyOn(Array.prototype, 'map').mockImplementation(function <T, U>(this: T[], fn: (value: T, index: number, array: T[]) => U) {
        const shouldIntercept =
          !intercepted &&
          this.length > 0 &&
          typeof (this[0] as { lever_id?: number }).lever_id === 'number' &&
          typeof (this[0] as { full_name?: string }).full_name === 'string';
        if (shouldIntercept) {
          intercepted = true;
          return originalMap.call(
            [{ id: 43, lever_id: undefined, full_name: 'Area', short_name: 'A' }] as unknown as T[],
            fn
          );
        }
        return originalMap.call(this, fn);
      });

      findSpy = jest.spyOn(Array.prototype, 'find').mockImplementation(function <T>(this: T[], fn: (value: T, index: number, array: T[]) => boolean) {
        const result = originalFind.call(this, fn);
        if (result && this.length > 0 && (this[0] as { id?: number }).id === 43) {
          return { lever_id: null, id: null, full_name: 'Catalog', short_name: 'C' } as T;
        }
        return result;
      });

      expect(
        enrichResearchAreas([{ id: 43, full_name: 'Area', short_name: 'A' } as never], [{ id: 43, full_name: 'Catalog', short_name: 'C' } as never])[0]
      ).toMatchObject({
        id: 43,
        lever_id: 43,
        short_name: 'A'
      });

      findSpy.mockRestore();
    });

    it('covers enrichResearchAreas match id fallback when lever_id is null on catalog item', () => {
      expect(
        enrichResearchAreas([{ id: 45, full_name: 'Area', short_name: 'A' } as never], [
          { id: 45, lever_id: null, full_name: 'Catalog', short_name: 'C' } as never
        ])[0]
      ).toMatchObject({
        id: 45,
        lever_id: 45
      });
    });
  });
});
