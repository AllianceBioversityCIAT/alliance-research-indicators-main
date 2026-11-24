import {
  buildResultPdfUrl,
  mapActorTypeIcons,
  mapAllianceAlignmentSection,
  mapCapSharingSection,
  mapGeneralInformationSection,
  mapGeographicScopeSection,
  mapInnovationDetailsSection,
  mapPartnersSection,
  mapPolicyAmountStatus,
  mapPolicyChangeSection,
  mapYesNoLabel,
  formatPdfGeneratedAt,
  getOrdinalDaySuffix,
} from './result-pdf-report.mapper';

describe('result-pdf-report.mapper', () => {
  it('maps general information to the PDF demo shape', () => {
    const result = mapGeneralInformationSection(
      {
        title: 'Sample title',
        description: 'Sample description',
        year: 2025,
        keywords: ['Science'],
        main_contact_person: {
          user_id: 'o.chinyere@cgiar.org',
          user: {
            first_name: 'Obilo',
            last_name: 'Chinyere',
            email: 'o.chinyere@cgiar.org',
          },
        } as any,
      },
      {
        indicator_id: 4,
        indicator_name: 'Capacity Sharing for Development',
        result_official_code: 8245,
        status_name: 'Submitted',
        result_status: {
          name: 'Submitted',
          description: 'Result submitted for review',
          config: {
            color: {
              border: '#1E88E5',
              text: '#1565C0',
            },
          },
        },
      } as any,
      new Date('2025-02-18T20:18:00.000Z'),
    );

    expect(result.title).toBe('Sample title');
    expect(result.result_code).toBe(8245);
    expect(result.year).toBe('2025');
    expect(result.result_type).toBe('Capacity Sharing for Development');
    expect(result.main_contact_display).toBe(
      'Obilo Chinyere (o.chinyere@cgiar.org)',
    );
    expect(result.generated_at).toContain('2025');
    expect(result.status).toEqual({
      status_name: 'Submitted',
      status_description: 'Result submitted for review',
      status_border_color: '#1E88E5',
      status_text_color: '#1565C0',
    });
  });

  it('maps geographic scope with flattened region and country names', () => {
    const result = mapGeographicScopeSection({
      geo_scope_id: 1 as any,
      comment_geo_scope: 'Global comment',
      regions: [{ region_id: 1, region: { name: 'Eastern Africa' } } as any],
      countries: [
        {
          isoAlpha2: 'ET',
          country: { name: 'Ethiopia' },
          result_countries_sub_nationals: [],
        } as any,
      ],
    });

    expect(result.geo_scope_id).toBe('1');
    expect(result.regions).toEqual([{ region_id: 1, name: 'Eastern Africa' }]);
    expect(result.countries[0]).toEqual({
      isoAlpha2: 'ET',
      name: 'Ethiopia',
      result_countries_sub_nationals: [],
    });
  });

  it('maps partners with headquarters from institution locations', () => {
    const result = mapPartnersSection(
      [
        {
          institution_id: 101,
          institution_role_id: 3,
          institution: {
            acronym: 'WUR',
            name: 'Wageningen University and Research Centre',
            institution_type: { name: 'Research organizations' },
            institution_locations: [
              { isHeadquarter: true, name: 'Netherlands', isoAlpha2: 'NL' },
            ],
          },
        } as any,
      ],
      false,
    );

    expect(result.institutions[0]).toEqual({
      institution_id: 101,
      institution_role_id: 3,
      acronym: 'WUR',
      name: 'Wageningen University and Research Centre',
      institution_type_name: 'Research organizations',
      headquarters: 'Netherlands',
      isoAlpha2: 'NL',
    });
  });

  describe('getOrdinalDaySuffix', () => {
    it.each([
      [1, 'st'],
      [2, 'nd'],
      [3, 'rd'],
      [4, 'th'],
      [10, 'th'],
      [11, 'th'],
      [12, 'th'],
      [13, 'th'],
      [18, 'th'],
      [21, 'st'],
      [22, 'nd'],
      [23, 'rd'],
      [31, 'st'],
    ])('day %i returns %s suffix', (day, suffix) => {
      expect(getOrdinalDaySuffix(day)).toBe(suffix);
    });
  });

  it('formats generated_at with ordinal day suffix', () => {
    const formatted = formatPdfGeneratedAt(
      new Date('2025-02-18T20:18:00.000Z'),
    );
    const day = new Date('2025-02-18T20:18:00.000Z').getDate();
    expect(formatted).toMatch(
      new RegExp(`${day}${getOrdinalDaySuffix(day)}, 2025`),
    );
  });

  it('maps cap sharing section with individual data and labels', () => {
    const result = mapCapSharingSection(
      {
        delivery_modality_id: 3,
        session_format_id: 1,
        individual: {
          trainee_name: 'test',
          gender_id: 3,
        },
      },
      {
        session_format_label: 'Individual training',
        gender_label: 'Non-binary',
      },
    );

    expect(result.individual).toEqual({
      trainee_name: 'test',
      gender_id: 3,
    });
    expect(result.session_format_label).toBe('Individual training');
    expect(result.gender_label).toBe('Non-binary');
    expect(result.group).toBeUndefined();
  });

  describe('mapAllianceAlignmentSection', () => {
    const BUCKET = 'https://bucket.example.com';
    const portfolio1 = {
      id: 1,
      name: 'Portfolio 1',
      start_year: 2021,
      end_year: 2025,
    };
    const portfolio2 = {
      id: '2',
      name: 'Portfolio 2',
      start_year: 2026,
      end_year: 2030,
    };
    const goal2 = {
      id: 2,
      smo_code: 2,
      short_name: 'Goal 2: Zero Hunger',
      full_name: 'End hunger',
      icon: 'https://reporting.cgiar.org/assets/sdg/2.png',
      color: '#DDA63A',
    };
    const sdgTargetRow = {
      result_lever_sdg_target_id: 1,
      result_lever_id: 99,
      sdg_target_id: 10,
      is_active: true,
      sdg_target: {
        id: 10,
        sdg_target_code: '2.5',
        sdg_target: 'By 2030, maintain genetic diversity',
        clarisa_sdg: goal2,
      },
    };
    const primaryLever = {
      result_lever_id: 99,
      result_id: 1,
      lever_id: '4',
      lever_role_id: 1,
      is_primary: true,
      lever: { short_name: 'Lever 4', full_name: 'Lever 4 - Agrobiodiversity' },
      result_lever_strategic_outcomes: [
        {
          lever_strategic_outcome_id: 41,
          is_active: true,
          lever_strategic_outcome: { strategic_outcome: 'SO1: Conserve' },
        },
        {
          lever_strategic_outcome_id: 42,
          is_active: false,
          lever_strategic_outcome: { strategic_outcome: 'SO2: Removed' },
        },
      ],
      result_lever_sdg_targets: [sdgTargetRow],
    };
    const otherLever = {
      result_lever_id: 100,
      result_id: 1,
      lever_id: '9',
      lever_role_id: 1,
      is_primary: false,
      custom_lever_name: ' Genebank Team ',
      lever: { short_name: 'Other', full_name: 'Other' },
    };
    const source = (overrides: Record<string, unknown>) =>
      ({
        indicatorId: 2,
        portfolio: portfolio1,
        contracts: [],
        levers: [primaryLever, otherLever],
        researchAreas: [
          {
            result_lever_id: 7,
            result_id: 1,
            lever_id: '12',
            lever_role_id: 3,
            is_primary: true,
            lever: {
              short_name: 'Biodiversity',
              full_name: 'Biodiversity for Food',
              icon: 'https://s3.example/area.png',
            },
          },
        ],
        strategicObjectives: [
          { strategic_objective: { id: 1, name: 'Transform food systems' } },
        ],
        impactOutcomes: [
          {
            impact_outcome: {
              id: 2,
              name: 'Improved policy',
              description: 'Policy text',
            },
          },
        ],
        resultSdgTargets: [{ ...sdgTargetRow, result_lever_id: null }],
        resultSdgs: [{ clarisa_sdg_id: 2, clarisa_sdg: goal2 }],
        bucketUrl: BUCKET,
        leverByDepartmentId: new Map(),
        ...overrides,
      }) as any;

    it('Portfolio 1 sends levers and SDGs with their CLARISA icon and colour, no Portfolio 2 blocks', () => {
      const result = mapAllianceAlignmentSection(source({}));

      expect(result.portfolio).toEqual(portfolio1);
      expect(result.primary_levers.map((l) => l.lever_id)).toEqual(['4']);
      expect(result.primary_levers[0].icon).toBe(
        `${BUCKET}/images/levers/L4-Agrobiodiversity_COLOR.png`,
      );
      expect(result.contributor_levers[0]).toEqual(
        expect.objectContaining({
          lever_id: '9',
          custom_lever_name: 'Genebank Team',
          icon: `${BUCKET}/images/levers/other.png`,
        }),
      );
      expect(result.result_sdgs).toEqual([
        expect.objectContaining({
          id: 2,
          clarisa_sdg_id: 2,
          smo_code: 2,
          short_name: 'Goal 2: Zero Hunger',
          icon: goal2.icon,
          color: '#DDA63A',
        }),
      ]);
      expect(result.research_areas).toBeUndefined();
      expect(result.strategic_objectives).toBeUndefined();
      // Outcomes and targets belong to OICR only.
      expect(
        result.primary_levers[0].result_lever_strategic_outcomes,
      ).toBeUndefined();
      expect(result.primary_levers[0].result_lever_sdg_targets).toBeUndefined();
    });

    it('Portfolio 1 OICR sends active strategic outcomes on primary levers and SDG targets with their SDG, and no Contribution to SDG', () => {
      const result = mapAllianceAlignmentSection(source({ indicatorId: 5 }));

      expect(result.primary_levers[0].result_lever_strategic_outcomes).toEqual([
        { lever_strategic_outcome_id: 41, strategic_outcome: 'SO1: Conserve' },
      ]);
      expect(result.primary_levers[0].result_lever_sdg_targets).toEqual([
        expect.objectContaining({
          sdg_target_id: 10,
          sdg_target_code: '2.5',
          sdg_target: 'By 2030, maintain genetic diversity',
          clarisa_sdg: expect.objectContaining({ color: '#DDA63A' }),
        }),
      ]);
      expect(
        result.contributor_levers[0].result_lever_strategic_outcomes,
      ).toBeUndefined();
      expect(result.result_sdgs).toEqual([]);
    });

    it('Portfolio 2 Policy Change sends Research Areas, Strategic Objectives and Impact Outcomes instead of levers', () => {
      const result = mapAllianceAlignmentSection(
        source({ indicatorId: 4, portfolio: portfolio2 }),
      );

      expect(result.portfolio.id).toBe(2);
      expect(result.primary_levers).toBeUndefined();
      expect(result.contributor_levers).toBeUndefined();
      expect(result.research_areas).toEqual([
        expect.objectContaining({
          lever_id: '12',
          short_name: 'Biodiversity',
          icon: 'https://s3.example/area.png',
        }),
      ]);
      expect(result.strategic_objectives).toEqual([
        { id: 1, name: 'Transform food systems' },
      ]);
      expect(result.impact_outcomes).toEqual([
        { id: 2, name: 'Improved policy', description: 'Policy text' },
      ]);
      expect(result.result_sdg_targets).toBeUndefined();
      expect(result.result_sdgs).toHaveLength(1);
    });

    it('Portfolio 2 leaves Impact Outcomes out for indicators other than 4, 5 and 6', () => {
      const result = mapAllianceAlignmentSection(
        source({ indicatorId: 1, portfolio: portfolio2 }),
      );
      expect(result.impact_outcomes).toBeUndefined();
      expect(result.strategic_objectives).toHaveLength(1);
    });

    it('Portfolio 2 OICR sends the result-level SDG targets and no Contribution to SDG', () => {
      const result = mapAllianceAlignmentSection(
        source({ indicatorId: 5, portfolio: portfolio2 }),
      );
      expect(result.result_sdg_targets).toEqual([
        expect.objectContaining({ sdg_target_code: '2.5', sdg_target_id: 10 }),
      ]);
      expect(result.impact_outcomes).toHaveLength(1);
      expect(result.result_sdgs).toEqual([]);
    });

    it('sends the portfolio years the "Portfolio 2026–2030" tag needs, with a numeric id', () => {
      const result = mapAllianceAlignmentSection(
        source({ portfolio: portfolio2 }),
      );
      expect(result.portfolio).toEqual(
        expect.objectContaining({ id: 2, start_year: 2026, end_year: 2030 }),
      );
    });

    it('flags a contract as contributing to CGIAR Portfolio by its own flag or an active bilateral mapping, as STAR does', () => {
      const contract = (agreement: string, flag: unknown) => ({
        result_contract_id: 1,
        result_id: 1,
        contract_id: agreement,
        contract_role_id: 1,
        is_primary: agreement === 'A1',
        is_active: true,
        agresso_contract: {
          agreement_id: agreement,
          is_pool_funding_contributor: flag,
        },
      });
      const result = mapAllianceAlignmentSection(
        source({
          contracts: [
            contract('A1', true),
            contract('A2', 1),
            contract('A3', false),
            contract('A4', 0),
          ],
          poolFundingAgreementIds: new Set(['A3']),
        }),
      );

      expect(
        result.contracts.map((c) => [
          c.contract_id,
          c.is_pool_funding_contributor,
        ]),
      ).toEqual([
        ['A1', true],
        ['A2', true],
        ['A3', true],
        ['A4', false],
      ]);
    });

    it('a result with no portfolio is sent as Portfolio 1 with portfolio null', () => {
      const result = mapAllianceAlignmentSection(source({ portfolio: null }));
      expect(result.portfolio).toBeNull();
      expect(result.primary_levers).toHaveLength(1);
    });
  });

  it('mapYesNoLabel resolves booleans and 0/1 and leaves a missing answer out', () => {
    expect(mapYesNoLabel(true)).toBe('Yes');
    expect(mapYesNoLabel(0)).toBe('No');
    expect(mapYesNoLabel(null)).toBeUndefined();
  });

  it('maps innovation details with resolved labels and enriched linked results', () => {
    const linked = [
      {
        link_result_id: 1,
        other_result_id: 26053,
        link_result_role_id: 2,
        linked_result_title: 'Linked',
        result_type_label: 'Innovation Development',
      },
    ];
    const result = mapInnovationDetailsSection(
      {
        short_title: 'Maize',
        innovation_type_id: 12,
        knowledge_sharing_form: {
          is_knowledge_sharing: true,
          link_to_result: [{ other_result_id: 26053 }],
        },
      } as any,
      {
        innovation_type: { code: 12, name: 'New or improved variety' },
        tool_function_labels: ['Decision support'],
        anticipated_users_label: undefined,
      },
      linked,
    );

    expect(result.short_title).toBe('Maize');
    expect(result.innovation_type.name).toBe('New or improved variety');
    expect(result.tool_function_labels).toEqual(['Decision support']);
    expect(result.knowledge_sharing_form.link_to_result).toEqual(linked);
    expect('anticipated_users_label' in result).toBe(false);
  });

  describe('mapPolicyChangeSection', () => {
    const implementingOrganization = {
      result_institution_id: 10948,
      result_id: 30341,
      institution_id: 7,
      institution_role_id: 4,
      is_active: true,
      institution: {
        acronym: 'MoALD',
        name: 'Ministry of Agriculture and Livestock Development, Kenya',
        institution_type: { name: 'Government (National)' },
        institution_locations: [
          { isHeadquarter: true, name: 'Kenya', isoAlpha2: 'KE' },
        ],
      },
    } as any;

    const linkedResult = {
      result_id: '30339',
      result_official_code: '9150',
      platform_code: 'STAR',
      title: 'Drought-tolerant maize',
      report_year_id: '2025',
      result_status: {
        result_status_id: '6',
        name: 'Approved',
        config: { color: { border: '#6FA17A', text: '#6FA17A' } },
      },
    } as any;

    it('replaces every id with complete data for a Program, Budget, or Investment', () => {
      const section = mapPolicyChangeSection({
        policyChange: {
          policy_type_id: '3',
          policy_type: { name: 'Program, Budget, or Investment' },
          policy_stage_id: '2',
          policy_stage: { name: 'Stage 2: Policy enacted' },
          usd_amount: '1250000.00',
          amount_status: 'Confirmed',
          evidence_stage: 'Line one\nLine two',
        } as any,
        implementingOrganizations: [implementingOrganization],
        innovationDevelopment: linkedResult,
        innovationUse: null,
      });

      expect(section).toEqual({
        policy_type_id: 3,
        policy_type: { id: 3, name: 'Program, Budget, or Investment' },
        policy_stage_id: 2,
        policy_stage: { id: 2, name: 'Stage 2: Policy enacted' },
        usd_amount: 1250000,
        amount_status: { id: 1, name: 'Confirmed' },
        evidence_stage: 'Line one\nLine two',
        implementing_organization: [
          {
            result_institution_id: 10948,
            result_id: 30341,
            is_active: true,
            institution_id: 7,
            institution_role_id: 4,
            acronym: 'MoALD',
            name: 'Ministry of Agriculture and Livestock Development, Kenya',
            institution_type_name: 'Government (National)',
            headquarters: 'Kenya',
            isoAlpha2: 'KE',
          },
        ],
        innovation_development: {
          result_id: 30339,
          result_official_code: 9150,
          platform_code: 'STAR',
          title: 'Drought-tolerant maize',
          report_year: 2025,
          result_status: {
            result_status_id: 6,
            name: 'Approved',
            config: { color: { border: '#6FA17A', text: '#6FA17A' } },
          },
        },
        innovation_use: null,
      });
    });

    it('keeps a zero amount', () => {
      const section = mapPolicyChangeSection({
        policyChange: {
          policy_type_id: 3,
          policy_type: { name: 'Program, Budget, or Investment' },
          usd_amount: '0.00',
          amount_status: 'Estimated',
        } as any,
        implementingOrganizations: [],
        innovationDevelopment: null,
        innovationUse: null,
      });

      expect(section.usd_amount).toBe(0);
      expect(section.amount_status).toEqual({ id: 2, name: 'Estimated' });
    });

    it('leaves the amount out for any other policy type', () => {
      const section = mapPolicyChangeSection({
        policyChange: {
          policy_type_id: 1,
          policy_type: { name: 'Policy or Strategy' },
          usd_amount: '500.00',
          amount_status: 'Confirmed',
        } as any,
        implementingOrganizations: [],
        innovationDevelopment: null,
        innovationUse: null,
      });

      expect(section).not.toHaveProperty('usd_amount');
      expect(section).not.toHaveProperty('amount_status');
    });

    it('returns nulls and no organizations when the result has no policy change yet', () => {
      expect(
        mapPolicyChangeSection({
          policyChange: null,
          implementingOrganizations: [
            { ...implementingOrganization, is_active: false },
          ],
          innovationDevelopment: null,
          innovationUse: null,
        }),
      ).toEqual({
        policy_type_id: null,
        policy_type: null,
        policy_stage_id: null,
        policy_stage: null,
        evidence_stage: null,
        implementing_organization: [],
        innovation_development: null,
        innovation_use: null,
      });
    });

    it('sends a null title and status when the linked result lacks them', () => {
      const section = mapPolicyChangeSection({
        policyChange: null,
        implementingOrganizations: [],
        innovationDevelopment: null,
        innovationUse: {
          ...linkedResult,
          title: undefined,
          report_year_id: null,
          result_status: undefined,
        },
      });

      expect(section.innovation_use).toEqual(
        expect.objectContaining({
          title: null,
          report_year: null,
          result_status: null,
        }),
      );
    });
  });

  describe('mapPolicyAmountStatus', () => {
    it.each([
      ['Confirmed', { id: 1, name: 'Confirmed' }],
      ['Estimated', { id: 2, name: 'Estimated' }],
      ['Unknown', { id: 3, name: 'Unknown' }],
      ['Other', null],
      [null, null],
    ])('maps %p', (value, expected) => {
      expect(mapPolicyAmountStatus(value as string | null)).toEqual(expected);
    });
  });

  describe('mapActorTypeIcons', () => {
    const BUCKET = 'https://alliance-files-storage.s3.us-east-1.amazonaws.com';

    it('maps every catalog actor type to its image in production', () => {
      expect(mapActorTypeIcons(`${BUCKET}/`, true, [1, 2, 3, 4, 5, 2])).toEqual(
        {
          1: `${BUCKET}/public/images/users-farmers.png`,
          2: `${BUCKET}/public/images/user-researchers.png`,
          3: `${BUCKET}/public/images/users-extension-agents.png`,
          4: `${BUCKET}/public/images/users-policy.png`,
          5: `${BUCKET}/public/images/users-other.png`,
        },
      );
    });

    it('reads the public-dev folder outside production and skips unknown or empty ids', () => {
      expect(
        mapActorTypeIcons(BUCKET, false, [4, 99, null, undefined]),
      ).toEqual({ 4: `${BUCKET}/public-dev/images/users-policy.png` });
    });

    it.each([undefined, '', 'alliance-files-storage', '/images'])(
      'sends nothing when the bucket URL is %p (not absolute)',
      (bucketUrl) => {
        expect(mapActorTypeIcons(bucketUrl, true, [1])).toEqual({});
      },
    );
  });

  describe('buildResultPdfUrl', () => {
    const HOST = 'https://star.alliance.cgiar.org';
    const STAR_INN_DEV = {
      platform_code: 'STAR',
      result_official_code: 9150,
      indicator_id: 2,
      report_year_id: 2025,
    };

    it('links a STAR result to its report viewer page with its version', () => {
      expect(buildResultPdfUrl(`${HOST}/`, STAR_INN_DEV)).toBe(
        `${HOST}/reports/result/STAR-9150?version=2025`,
      );
    });

    it('omits the version when the result has no report year', () => {
      expect(
        buildResultPdfUrl(HOST, { ...STAR_INN_DEV, report_year_id: null }),
      ).toBe(`${HOST}/reports/result/STAR-9150`);
    });

    it.each([1, 2, 4])('links indicator %p, which has a PDF template', (id) => {
      expect(
        buildResultPdfUrl(HOST, { ...STAR_INN_DEV, indicator_id: id }),
      ).not.toBeNull();
    });

    it.each([
      ['a result outside STAR', { ...STAR_INN_DEV, platform_code: 'TIP' }],
      ['an indicator without template', { ...STAR_INN_DEV, indicator_id: 6 }],
      ['a missing code', { ...STAR_INN_DEV, result_official_code: null }],
      ['no result', null],
    ])('is null for %s', (_label, result) => {
      expect(buildResultPdfUrl(HOST, result)).toBeNull();
    });

    it.each([undefined, '', 'star.alliance.cgiar.org'])(
      'is null when the client host is %p (not absolute)',
      (host) => {
        expect(buildResultPdfUrl(host, STAR_INN_DEV)).toBeNull();
      },
    );
  });
});
