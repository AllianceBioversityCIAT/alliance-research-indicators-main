import {
  mapAllianceAlignmentSection,
  mapCapSharingSection,
  mapGeneralInformationSection,
  mapGeographicScopeSection,
  mapPartnersSection,
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

  it('merges alignment lever metadata with sdg targets and strategic outcomes', () => {
    const sdgTargets = [
      {
        result_lever_sdg_target_id: 1,
        result_lever_id: 99,
        sdg_target_id: 10,
      },
    ];
    const strategicOutcomes = [
      { result_lever_strategic_outcome_id: 2, strategic_outcome_id: 5 },
    ];
    const sdgTargetsWithRelations = [
      {
        result_lever_sdg_target_id: 1,
        result_lever_id: 99,
        sdg_target_id: 10,
        sdg_target: {
          id: 10,
          sdg_target_code: '2.5',
          sdg_target: 'By 2030, maintain genetic diversity',
        },
      },
    ];

    const result = mapAllianceAlignmentSection(
      {
        primary_levers: [
          {
            result_lever_id: 99,
            result_id: 1,
            lever_id: '3',
            lever_role_id: 1,
            is_primary: true,
            result_lever_sdg_targets: sdgTargets,
            result_lever_strategic_outcomes: strategicOutcomes,
          },
        ],
        contributor_levers: [],
        result_sdgs: [],
        contracts: [],
      } as any,
      4,
      [],
      [
        {
          result_lever_id: 99,
          result_id: 1,
          lever_id: '3',
          lever_role_id: 1,
          is_primary: true,
          lever: { short_name: 'GEN', full_name: 'Genetic Innovation' },
        },
      ] as any,
      sdgTargetsWithRelations as any,
      'https://bucket.example.com',
      new Map(),
    );

    expect(result.primary_levers[0]).toEqual(
      expect.objectContaining({
        short_name: 'GEN',
        full_name: 'Genetic Innovation',
        result_lever_strategic_outcomes: strategicOutcomes,
        result_lever_sdg_targets: [
          {
            result_lever_sdg_target_id: 1,
            result_lever_id: 99,
            sdg_target_id: 10,
            name: '2.5',
            description: 'By 2030, maintain genetic diversity',
          },
        ],
      }),
    );
  });
});
