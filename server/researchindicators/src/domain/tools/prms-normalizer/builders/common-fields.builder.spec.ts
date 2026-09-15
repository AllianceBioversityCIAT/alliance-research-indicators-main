import { ClarisaGeoScopeEnum } from '../../clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import {
  CommonFieldsBuilder,
  PrmsPayloadBuildError,
  sumUserEnteredCounts,
} from './common-fields.builder';

/**
 * Expected centre objects transcribed from homologation.md §1.3 (D-7).
 * En-dash in `name` is U+2013, copied from that table — not from builder output.
 */
const EXCIAT_CENTER = {
  institution_id: 46,
  acronym: 'ABC RH - CIAT (Alliance)',
  name: 'Alliance of Bioversity and CIAT \u2013 Regional Hub (International Center for Tropical Agriculture / Centro Internacional de Agricultura Tropical)',
};

const EXBIO_CENTER = {
  institution_id: 49,
  acronym: 'ABC - Bioversity (Alliance)',
  name: 'Alliance of Bioversity and CIAT \u2013 Headquarter (Bioversity International)',
};

const ADA = {
  email: 'ada.lovelace@cgiar.org',
  first_name: 'Ada',
  last_name: 'Lovelace',
};

const GRACE = {
  email: 'grace.hopper@cgiar.org',
  first_name: 'Grace',
  last_name: 'Hopper',
};

const ALAN = {
  email: 'alan.turing@cgiar.org',
  first_name: 'Alan',
  last_name: 'Turing',
};

const KATHERINE = {
  email: 'katherine.johnson@cgiar.org',
  first_name: 'Katherine',
  last_name: 'Johnson',
};

const CREATED_AT = new Date('2024-03-01T10:00:00.000Z');
const SUBMITTED_AT = new Date('2025-06-15T14:30:00.000Z');

const baseAggregate = (
  overrides: Partial<PrmsSyncAggregate> = {},
): PrmsSyncAggregate => ({
  result_id: 9001,
  result_official_code: 1441061,
  indicator_id: 1,
  created_at: CREATED_AT,
  title: 'Capacity sharing common-fields fixture',
  description: 'Common-fields payload for capacity_sharing',
  geo_scope_id: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
  is_partner_not_applicable: false,
  created_by: ADA,
  submitted_by: {
    staff: ADA,
    submitted_date: SUBMITTED_AT,
    comment: 'Approved for PRMS sync',
  },
  lead_contact: ADA,
  primary_contract: {
    agreement_id: 'D-1441061',
    description: 'Capacity sharing grant',
    ubwClientDescription: 'ExCIAT',
    is_primary: true,
  },
  contracts: [
    {
      agreement_id: 'D-1441061',
      description: 'Capacity sharing grant',
      ubwClientDescription: 'ExCIAT',
      is_primary: true,
    },
  ],
  science_programs: [
    {
      sp_code: 'SP01',
      sp_role: 'PRIMARY',
      toc_result_title: 'Primary ToC result for SP01',
      indicator_description: 'Primary indicator description for SP01',
      aligns_with_toc: true,
    },
  ],
  regions: [],
  countries: [],
  subnational_areas: [],
  partners: [
    {
      institution_id: 12,
      acronym: 'FAO',
      name: 'Food and Agriculture Organization',
    },
  ],
  evidence: [
    {
      link: 'https://example.org/cs-evidence',
      description: 'Public capacity-sharing evidence',
      is_private: false,
    },
  ],
  ...overrides,
});

const serialize = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

describe('CommonFieldsBuilder', () => {
  const builder = new CommonFieldsBuilder();

  describe('serialized JSON per type (homologation.md §4, R-PRMS-003 AC.1)', () => {
    it('matches §4 for a capacity_sharing fixture (scope 50, ExCIAT)', () => {
      const payload = serialize(builder.build(baseAggregate()));

      expect(payload).toEqual({
        external_reference: '1441061',
        keep_editing: false,
        created_date: '2024-03-01T10:00:00.000Z',
        created_by: {
          email: 'ada.lovelace@cgiar.org',
          name: 'Ada Lovelace',
        },
        submitted_by: {
          email: 'ada.lovelace@cgiar.org',
          name: 'Ada Lovelace',
          submitted_date: '2025-06-15T14:30:00.000Z',
          comment: 'Approved for PRMS sync',
        },
        lead_contact_person: {
          email: 'ada.lovelace@cgiar.org',
          name: 'Ada Lovelace',
        },
        lead_center: EXCIAT_CENTER,
        title: 'Capacity sharing common-fields fixture',
        description: 'Common-fields payload for capacity_sharing',
        toc_mapping: {
          science_program_id: 'SP01',
          result_title: 'Primary ToC result for SP01',
          result_indicator_description:
            'Primary indicator description for SP01',
        },
        geo_focus: {
          scope_code: 50,
          scope_label: 'This is yet to be determined',
        },
        contributing_center: [EXCIAT_CENTER],
        contributing_partners: [
          {
            institution_id: 12,
            acronym: 'FAO',
            name: 'Food and Agriculture Organization',
          },
        ],
        evidence: [
          {
            link: 'https://example.org/cs-evidence',
            description: 'Public capacity-sharing evidence',
          },
        ],
        contributing_bilateral_projects: [
          {
            grant_title: 'D-1441061-Capacity sharing grant',
            is_lead: true,
          },
        ],
      });
    });

    it('matches §4 for an innovation_development fixture (scope 1, ExBIO, No-ToC PRIMARY)', () => {
      const payload = serialize(
        builder.build(
          baseAggregate({
            result_id: 9002,
            result_official_code: 1441062,
            indicator_id: 2,
            title: 'Innovation development common-fields fixture',
            description: 'Common-fields payload for innovation_development',
            geo_scope_id: ClarisaGeoScopeEnum.GLOBAL,
            created_by: GRACE,
            submitted_by: {
              staff: GRACE,
              submitted_date: SUBMITTED_AT,
              comment: null,
            },
            lead_contact: GRACE,
            primary_contract: {
              agreement_id: 'D-1441062',
              description: 'Innovation development grant',
              ubwClientDescription: 'ExBIO',
              is_primary: true,
            },
            contracts: [
              {
                agreement_id: 'D-1441062',
                description: 'Innovation development grant',
                ubwClientDescription: 'ExBIO',
                is_primary: true,
              },
              {
                agreement_id: 'D-1441062B',
                description: 'Secondary development grant',
                ubwClientDescription: 'ExBIO',
                is_primary: false,
              },
            ],
            science_programs: [
              {
                sp_code: 'SP02',
                sp_role: 'PRIMARY',
                toc_result_title: null,
                indicator_description: null,
                aligns_with_toc: false,
              },
              {
                sp_code: 'SP03',
                sp_role: 'CONTRIBUTING',
                toc_result_title: 'Contributing ToC for SP03',
                indicator_description: 'Contributing indicator for SP03',
                aligns_with_toc: true,
              },
            ],
            partners: [],
            evidence: [],
          }),
        ),
      );

      expect(payload).toEqual({
        external_reference: '1441062',
        keep_editing: false,
        created_date: '2024-03-01T10:00:00.000Z',
        created_by: {
          email: 'grace.hopper@cgiar.org',
          name: 'Grace Hopper',
        },
        submitted_by: {
          email: 'grace.hopper@cgiar.org',
          name: 'Grace Hopper',
          submitted_date: '2025-06-15T14:30:00.000Z',
        },
        lead_contact_person: {
          email: 'grace.hopper@cgiar.org',
          name: 'Grace Hopper',
        },
        lead_center: EXBIO_CENTER,
        title: 'Innovation development common-fields fixture',
        description: 'Common-fields payload for innovation_development',
        toc_mapping: {
          science_program_id: 'SP02',
        },
        contributing_programs: [
          {
            science_program_id: 'SP03',
            result_title: 'Contributing ToC for SP03',
            result_indicator_description: 'Contributing indicator for SP03',
          },
        ],
        geo_focus: {
          scope_code: 1,
          scope_label: 'Global',
        },
        contributing_center: [EXBIO_CENTER],
        contributing_bilateral_projects: [
          {
            grant_title: 'D-1441062-Innovation development grant',
            is_lead: true,
          },
          {
            grant_title: 'D-1441062B-Secondary development grant',
            is_lead: false,
          },
        ],
      });
      expect(payload).not.toHaveProperty('contributing_partners');
      expect(payload).not.toHaveProperty('evidence');
    });

    it('matches §4 for a policy_change fixture (scope 3, two countries, ExCIAT)', () => {
      const payload = serialize(
        builder.build(
          baseAggregate({
            result_id: 9003,
            result_official_code: 1441063,
            indicator_id: 4,
            title: 'Policy change common-fields fixture',
            description: 'Common-fields payload for policy_change',
            geo_scope_id: ClarisaGeoScopeEnum.MULTI_NATIONAL,
            created_by: ALAN,
            submitted_by: {
              staff: ALAN,
              submitted_date: SUBMITTED_AT,
              comment: 'Policy approved',
            },
            lead_contact: ALAN,
            primary_contract: {
              agreement_id: 'D-1441063',
              description: 'Policy change grant',
              ubwClientDescription: 'ExCIAT',
              is_primary: true,
            },
            contracts: [
              {
                agreement_id: 'D-1441063',
                description: 'Policy change grant',
                ubwClientDescription: 'ExCIAT',
                is_primary: true,
              },
            ],
            science_programs: [
              {
                sp_code: 'SP04',
                sp_role: 'PRIMARY',
                toc_result_title: 'Policy ToC result',
                indicator_description: 'Policy indicator description',
                aligns_with_toc: true,
              },
            ],
            countries: [
              {
                id: 170,
                name: 'Colombia',
                iso_alpha_3: 'COL',
                iso_alpha_2: 'CO',
              },
              {
                id: 404,
                name: 'Kenya',
                iso_alpha_3: 'KEN',
                iso_alpha_2: 'KE',
              },
            ],
            partners: [
              {
                institution_id: 88,
                acronym: 'UNEP',
                name: 'United Nations Environment Programme',
              },
            ],
            evidence: [
              {
                link: 'https://example.org/policy-public',
                description: 'Public policy evidence',
                is_private: false,
              },
              {
                link: 'https://intranet.example.org/secret',
                description: 'Confidential',
                is_private: true,
              },
            ],
          }),
        ),
      );

      expect(payload).toEqual({
        external_reference: '1441063',
        keep_editing: false,
        created_date: '2024-03-01T10:00:00.000Z',
        created_by: {
          email: 'alan.turing@cgiar.org',
          name: 'Alan Turing',
        },
        submitted_by: {
          email: 'alan.turing@cgiar.org',
          name: 'Alan Turing',
          submitted_date: '2025-06-15T14:30:00.000Z',
          comment: 'Policy approved',
        },
        lead_contact_person: {
          email: 'alan.turing@cgiar.org',
          name: 'Alan Turing',
        },
        lead_center: EXCIAT_CENTER,
        title: 'Policy change common-fields fixture',
        description: 'Common-fields payload for policy_change',
        toc_mapping: {
          science_program_id: 'SP04',
          result_title: 'Policy ToC result',
          result_indicator_description: 'Policy indicator description',
        },
        geo_focus: {
          scope_code: 3,
          scope_label: 'Multi-national',
          countries: [
            {
              id: 170,
              name: 'Colombia',
              iso_alpha_3: 'COL',
              iso_alpha_2: 'CO',
            },
            {
              id: 404,
              name: 'Kenya',
              iso_alpha_3: 'KEN',
              iso_alpha_2: 'KE',
            },
          ],
        },
        contributing_center: [EXCIAT_CENTER],
        contributing_partners: [
          {
            institution_id: 88,
            acronym: 'UNEP',
            name: 'United Nations Environment Programme',
          },
        ],
        evidence: [
          {
            link: 'https://example.org/policy-public',
            description: 'Public policy evidence',
          },
        ],
        contributing_bilateral_projects: [
          {
            grant_title: 'D-1441063-Policy change grant',
            is_lead: true,
          },
        ],
      });
    });

    it('matches §4 for an innovation_use fixture (scope 2, ExBIO, partners not applicable)', () => {
      const payload = serialize(
        builder.build(
          baseAggregate({
            result_id: 9004,
            result_official_code: 1441064,
            indicator_id: 6,
            title: 'Innovation use common-fields fixture',
            description: 'Common-fields payload for innovation_use',
            geo_scope_id: ClarisaGeoScopeEnum.REGIONAL,
            is_partner_not_applicable: true,
            created_by: KATHERINE,
            submitted_by: {
              staff: KATHERINE,
              submitted_date: SUBMITTED_AT,
              comment: 'Use approved',
            },
            lead_contact: KATHERINE,
            primary_contract: {
              agreement_id: 'D-1441064',
              description: 'Innovation use grant',
              ubwClientDescription: 'exbio',
              is_primary: true,
            },
            contracts: [
              {
                agreement_id: 'D-1441064',
                description: 'Innovation use grant',
                ubwClientDescription: 'exbio',
                is_primary: true,
              },
            ],
            science_programs: [
              {
                sp_code: 'SP05',
                sp_role: 'PRIMARY',
                toc_result_title: null,
                indicator_description: null,
                aligns_with_toc: false,
              },
            ],
            regions: [{ um49code: 2, name: 'Africa' }],
            partners: [
              {
                institution_id: 12,
                acronym: 'FAO',
                name: 'Food and Agriculture Organization',
              },
            ],
            evidence: [],
          }),
        ),
      );

      expect(payload).toEqual({
        external_reference: '1441064',
        keep_editing: false,
        created_date: '2024-03-01T10:00:00.000Z',
        created_by: {
          email: 'katherine.johnson@cgiar.org',
          name: 'Katherine Johnson',
        },
        submitted_by: {
          email: 'katherine.johnson@cgiar.org',
          name: 'Katherine Johnson',
          submitted_date: '2025-06-15T14:30:00.000Z',
          comment: 'Use approved',
        },
        lead_contact_person: {
          email: 'katherine.johnson@cgiar.org',
          name: 'Katherine Johnson',
        },
        lead_center: EXBIO_CENTER,
        title: 'Innovation use common-fields fixture',
        description: 'Common-fields payload for innovation_use',
        toc_mapping: {
          science_program_id: 'SP05',
        },
        geo_focus: {
          scope_code: 2,
          scope_label: 'Regional',
          regions: [{ um49code: 2, name: 'Africa' }],
        },
        contributing_center: [EXBIO_CENTER],
        contributing_bilateral_projects: [
          {
            grant_title: 'D-1441064-Innovation use grant',
            is_lead: true,
          },
        ],
      });
      expect(payload).not.toHaveProperty('contributing_partners');
    });
  });

  describe('P-1 omitted fields (homologation.md §1.4 / §4.1, R-PRMS-008 AC.1, DC-5)', () => {
    it('omits number_people_trained.unknown, innovation_developers and toc_mapping.result_indicator_type_name', () => {
      const payload = builder.build(baseAggregate());
      const serialized = JSON.stringify(payload);

      expect(payload).not.toHaveProperty('number_people_trained');
      expect(payload).not.toHaveProperty('innovation_developers');
      expect(payload.toc_mapping).not.toHaveProperty(
        'result_indicator_type_name',
      );
      expect(payload.toc_mapping).not.toHaveProperty('aow_compose_code');
      expect(serialized).not.toContain('result_indicator_type_name');
      expect(serialized).not.toContain('innovation_developers');
      expect(serialized).not.toContain('"unknown"');
      expect(serialized).not.toContain('usd_budget');
      expect(serialized).not.toContain('is_determined');
    });
  });

  describe('permitted arithmetic (homologation.md §1.4 / §8.3, R-PRMS-008 AC.2)', () => {
    it('sums user-entered women_youth_count + women_not_youth_count', () => {
      expect(sumUserEnteredCounts(2, 5)).toBe(7);
      expect(sumUserEnteredCounts(0, 4)).toBe(4);
    });
  });

  describe('is_partner_not_applicable (homologation.md §4.4, R-PRMS-003 AC.4)', () => {
    it('omits contributing_partners entirely rather than sending an empty array', () => {
      const payload = builder.build(
        baseAggregate({
          is_partner_not_applicable: true,
          partners: [
            {
              institution_id: 12,
              acronym: 'FAO',
              name: 'Food and Agriculture Organization',
            },
          ],
        }),
      );

      expect(payload).not.toHaveProperty('contributing_partners');
      expect(JSON.stringify(payload)).not.toContain('contributing_partners');
    });
  });

  describe('centre map (homologation.md §1.3, R-PRMS-003 AC.2)', () => {
    it('maps ExCIAT to institution 46 and ExBIO to institution 49', () => {
      const ciat = builder.build(baseAggregate());
      expect(ciat.lead_center).toEqual(EXCIAT_CENTER);

      const bio = builder.build(
        baseAggregate({
          primary_contract: {
            agreement_id: 'D-1441061',
            description: 'Capacity sharing grant',
            ubwClientDescription: ' ExBIO ',
            is_primary: true,
          },
        }),
      );
      expect(bio.lead_center).toEqual(EXBIO_CENTER);
    });
  });

  describe('lead_contact_person (homologation.md §4 D-3, R-PRMS-008 scenario)', () => {
    it('throws naming lead_contact_person when the main contact is absent', () => {
      const aggregate = baseAggregate({ lead_contact: null });

      expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
      expect(() => builder.build(aggregate)).toThrow(/lead_contact_person/);

      expect.assertions(5);
      try {
        builder.build(aggregate);
      } catch (error) {
        expect(error).toBeInstanceOf(PrmsPayloadBuildError);
        expect((error as PrmsPayloadBuildError).field).toBe(
          'lead_contact_person',
        );
        expect((error as PrmsPayloadBuildError).message).toContain(
          'lead_contact_person',
        );
      }
    });

    it('does not substitute created_by or emit a partial lead_contact_person object', () => {
      const aggregate = baseAggregate({
        created_by: ADA,
        lead_contact: null,
      });

      expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
    });

    it('emits only email and name on lead_contact_person', () => {
      const payload = builder.build(baseAggregate());
      expect(Object.keys(payload.lead_contact_person as object).sort()).toEqual(
        ['email', 'name'],
      );
    });
  });

  describe('toc_mapping (homologation.md §4.1 / §4.2, R-PRMS-003 AC.3)', () => {
    it('refuses a legacy alignment with no PRIMARY science program', () => {
      const aggregate = baseAggregate({
        science_programs: [
          {
            sp_code: 'SP01',
            sp_role: null,
            toc_result_title: null,
            indicator_description: null,
            aligns_with_toc: null,
          },
        ],
      });

      expect(() => builder.build(aggregate)).toThrow(/toc_mapping/);
      expect.assertions(2);
      try {
        builder.build(aggregate);
      } catch (error) {
        expect((error as PrmsPayloadBuildError).field).toBe('toc_mapping');
      }
    });

    it('still builds toc_mapping from science_program_id when aligns_with_toc is false', () => {
      const payload = builder.build(
        baseAggregate({
          science_programs: [
            {
              sp_code: 'SP09',
              sp_role: 'PRIMARY',
              toc_result_title: null,
              indicator_description: null,
              aligns_with_toc: false,
            },
          ],
        }),
      );

      expect(payload.toc_mapping).toEqual({ science_program_id: 'SP09' });
      expect(payload).not.toHaveProperty('contributing_programs');
    });
  });

  describe('geo_focus conditionals (homologation.md §4.3, R-PRMS-003 scenario)', () => {
    it('fails a scope-3 result with one country naming the ≥2-country rule and does not invent a second country', () => {
      const aggregate = baseAggregate({
        geo_scope_id: ClarisaGeoScopeEnum.MULTI_NATIONAL,
        countries: [
          {
            id: 170,
            name: 'Colombia',
            iso_alpha_3: 'COL',
            iso_alpha_2: 'CO',
          },
        ],
      });

      expect(() => builder.build(aggregate)).toThrow(/at least 2 countries/);
      expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
    });

    it('accepts scope 50 with no companion geography and the exact T-01 label', () => {
      const payload = builder.build(baseAggregate());
      expect(payload.geo_focus).toEqual({
        scope_code: 50,
        scope_label: 'This is yet to be determined',
      });
    });

    it('accepts scope 4 with one country and scope 5 with country plus sub-national', () => {
      const national = builder.build(
        baseAggregate({
          geo_scope_id: ClarisaGeoScopeEnum.NATIONAL,
          countries: [
            {
              id: 170,
              name: 'Colombia',
              iso_alpha_3: 'COL',
              iso_alpha_2: 'CO',
            },
          ],
        }),
      );
      expect(national.geo_focus).toEqual({
        scope_code: 4,
        scope_label: 'National',
        countries: [
          {
            id: 170,
            name: 'Colombia',
            iso_alpha_3: 'COL',
            iso_alpha_2: 'CO',
          },
        ],
      });

      const subnational = builder.build(
        baseAggregate({
          geo_scope_id: ClarisaGeoScopeEnum.SUB_NATIONAL,
          countries: [
            {
              id: 170,
              name: 'Colombia',
              iso_alpha_3: 'COL',
              iso_alpha_2: 'CO',
            },
          ],
          subnational_areas: [{ id: 1001, name: 'Cauca' }],
        }),
      );
      expect(subnational.geo_focus).toEqual({
        scope_code: 5,
        scope_label: 'Sub-national',
        countries: [
          {
            id: 170,
            name: 'Colombia',
            iso_alpha_3: 'COL',
            iso_alpha_2: 'CO',
          },
        ],
        subnational_areas: [{ id: 1001, name: 'Cauca' }],
      });
    });
  });

  describe('keep_editing (homologation.md §4)', () => {
    it('sends keep_editing false inside data', () => {
      expect(builder.build(baseAggregate()).keep_editing).toBe(false);
    });
  });
});
