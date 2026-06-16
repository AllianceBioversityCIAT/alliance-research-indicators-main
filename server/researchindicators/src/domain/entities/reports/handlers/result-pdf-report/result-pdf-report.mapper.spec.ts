import {
  mapGeneralInformationSection,
  mapGeographicScopeSection,
  mapPartnersSection,
  formatPdfGeneratedAt,
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
            institution_locations: [{ isHeadquarter: true, name: 'Netherlands' }],
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

  it('formats generated_at with ordinal day suffix', () => {
    const formatted = formatPdfGeneratedAt(new Date('2025-02-18T20:18:00.000Z'));
    expect(formatted).toMatch(/18th, 2025/);
  });
});
