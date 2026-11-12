import {
  mapAllianceAlignmentSection,
  mapCapSharingSection,
  mapGeneralInformationSection,
  mapGeographicScopeSection,
  mapInnovationDetailsSection,
  mapPartnersSection,
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
              { isHeadquarter: true, name: 'Netherlands' },
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
});
