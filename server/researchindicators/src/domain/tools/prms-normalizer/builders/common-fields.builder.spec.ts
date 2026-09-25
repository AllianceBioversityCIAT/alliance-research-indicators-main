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
    clarisa_project_short_name: 'B-D-1441061',
    clarisa_external_code: 'D-1441061',
    description: 'Capacity sharing grant',
    ubwClientDescription: 'ExCIAT',
    is_primary: true,
  },
  contracts: [
    {
      agreement_id: 'D-1441061',
      clarisa_project_short_name: 'B-D-1441061',
      clarisa_external_code: 'D-1441061',
      description: 'Capacity sharing grant',
      ubwClientDescription: 'ExCIAT',
      is_primary: true,
    },
  ],
  science_programs: [
    {
      sp_code: 'SP01',
      sp_role: 'PRIMARY',
      toc_result_id: 6339,
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
          toc_result_id: 6339,
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
            grant_title: 'B-D-1441061',
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
              clarisa_project_short_name: 'B-D-1441062',
              clarisa_external_code: 'D-1441062',
              description: 'Innovation development grant',
              ubwClientDescription: 'ExBIO',
              is_primary: true,
            },
            contracts: [
              {
                agreement_id: 'D-1441062',
                clarisa_project_short_name: 'B-D-1441062',
                clarisa_external_code: 'D-1441062',
                description: 'Innovation development grant',
                ubwClientDescription: 'ExBIO',
                is_primary: true,
              },
              {
                agreement_id: 'D-1441062B',
                clarisa_project_short_name: 'B-D-1441062B',
                clarisa_external_code: 'D-1441062B',
                description: 'Secondary development grant',
                ubwClientDescription: 'ExBIO',
                is_primary: false,
              },
            ],
            science_programs: [
              {
                sp_code: 'SP02',
                sp_role: 'PRIMARY',
                toc_result_id: null,
                toc_result_title: null,
                indicator_description: null,
                aligns_with_toc: false,
              },
              {
                sp_code: 'SP03',
                sp_role: 'CONTRIBUTING',
                toc_result_id: 6401,
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
            toc_result_id: 6401,
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
            grant_title: 'B-D-1441062',
            is_lead: true,
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
              clarisa_project_short_name: 'B-D-1441063',
              clarisa_external_code: 'D-1441063',
              description: 'Policy change grant',
              ubwClientDescription: 'ExCIAT',
              is_primary: true,
            },
            contracts: [
              {
                agreement_id: 'D-1441063',
                clarisa_project_short_name: 'B-D-1441063',
                clarisa_external_code: 'D-1441063',
                description: 'Policy change grant',
                ubwClientDescription: 'ExCIAT',
                is_primary: true,
              },
            ],
            science_programs: [
              {
                sp_code: 'SP04',
                sp_role: 'PRIMARY',
                toc_result_id: 6518,
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
          toc_result_id: 6518,
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
            grant_title: 'B-D-1441063',
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
              clarisa_project_short_name: 'B-D-1441064',
              clarisa_external_code: 'D-1441064',
              description: 'Innovation use grant',
              ubwClientDescription: 'exbio',
              is_primary: true,
            },
            contracts: [
              {
                agreement_id: 'D-1441064',
                clarisa_project_short_name: 'B-D-1441064',
                clarisa_external_code: 'D-1441064',
                description: 'Innovation use grant',
                ubwClientDescription: 'exbio',
                is_primary: true,
              },
            ],
            science_programs: [
              {
                sp_code: 'SP05',
                sp_role: 'PRIMARY',
                toc_result_id: null,
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
            grant_title: 'B-D-1441064',
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
            clarisa_project_short_name: 'B-D-1441061',
            clarisa_external_code: 'D-1441061',
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
            toc_result_id: null,
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
              toc_result_id: null,
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

  describe('contributing_bilateral_projects (2026-09-21)', () => {
    // PRMS refused the old shape by name: "no project of the 2026 reporting phase
    // matches grant_title \"A1080-CROP TRUST Providing for ...\". Send the
    // project's registry code (its `external_code` / short name) rather than its
    // full title." The registry code is the CLARISA short name.

    const entryFor = (contract: Record<string, unknown>) =>
      (
        builder.build(baseAggregate({ contracts: [contract] as never }))
          .contributing_bilateral_projects as Record<string, unknown>[]
      )[0];

    it('sends ONLY is_lead and grant_title', () => {
      const entry = entryFor({
        agreement_id: 'A1080',
        description: 'CROP TRUST Providing for the long-term funding',
        clarisa_project_short_name: 'B-A1080',
        clarisa_external_code: 'A1080',
        is_primary: true,
      });

      expect(Object.keys(entry).sort()).toEqual(['grant_title', 'is_lead']);
      expect(entry.grant_title).toBe('B-A1080');
      expect(entry.is_lead).toBe(true);
    });

    it('never lets the project description reach grant_title', () => {
      // The concatenated title is precisely what PRMS could not match.
      const entry = entryFor({
        agreement_id: 'A1080',
        description: 'CROP TRUST Providing for the long-term funding',
        clarisa_project_short_name: 'B-A1080',
        clarisa_external_code: 'A1080',
        is_primary: true,
      });

      expect(JSON.stringify(entry)).not.toContain('CROP TRUST');
    });

    it('falls back to clarisa_external_code when the short name is missing', () => {
      // Measured: 1 of the 28 contracts in use has a mapping row with a null
      // short name (D514).
      const entry = entryFor({
        agreement_id: 'D514',
        description: 'x',
        clarisa_project_short_name: null,
        clarisa_external_code: 'D514',
        is_primary: true,
      });

      expect(entry.grant_title).toBe('D514');
    });

    it('falls back to agreement_id when the contract has NO mapping row', () => {
      // Measured: 8 of the 28 contracts in use have no active mapping row, so the
      // LEFT JOIN leaves both columns null. Sending the AGRESSO id keeps the
      // project in the payload and lets PRMS say what is wrong, instead of STAR
      // refusing a send over a data gap it cannot fix.
      const entry = entryFor({
        agreement_id: 'D527',
        description: 'x',
        clarisa_project_short_name: null,
        clarisa_external_code: null,
        is_primary: true,
      });

      expect(entry.grant_title).toBe('D527');
    });

    it('sends ONLY the lead contract, never the others', () => {
      const entries = builder.build(
        baseAggregate({
          contracts: [
            {
              agreement_id: 'A1065',
              clarisa_project_short_name: 'B-A1065',
              is_primary: false,
            },
            {
              agreement_id: 'A1080',
              clarisa_project_short_name: 'B-A1080',
              is_primary: true,
            },
            {
              agreement_id: 'A999',
              clarisa_project_short_name: 'B-A999',
              is_primary: false,
            },
          ] as never,
        }),
      ).contributing_bilateral_projects as Record<string, unknown>[];

      expect(entries).toEqual([{ grant_title: 'B-A1080', is_lead: true }]);
    });

    it('omits the key entirely when no contract is the lead', () => {
      // Not `[]`: an empty array asserts "there is no lead project", which is a
      // different claim from "we are not declaring one".
      const data = builder.build(
        baseAggregate({
          contracts: [
            {
              agreement_id: 'A1065',
              clarisa_project_short_name: 'B-A1065',
              is_primary: false,
            },
          ] as never,
        }),
      );

      expect('contributing_bilateral_projects' in data).toBe(false);
    });

    it('prefers the short name over both fallbacks', () => {
      const entry = entryFor({
        agreement_id: 'A1',
        clarisa_project_short_name: 'SHORT',
        clarisa_external_code: 'EXT',
        is_primary: true,
      });

      expect(entry.grant_title).toBe('SHORT');
    });

    it('refuses only when every candidate is empty', () => {
      expect(() =>
        builder.build(
          baseAggregate({
            contracts: [
              {
                agreement_id: '   ',
                clarisa_project_short_name: null,
                clarisa_external_code: null,
                is_primary: true,
              },
            ] as never,
          }),
        ),
      ).toThrow(/grant_title/);
    });
  });

  describe('geo_focus conditionals (homologation.md §4.3, R-PRMS-003 scenario)', () => {
    const country = (id: number, name: string, a3: string, a2: string) => ({
      id,
      name,
      iso_alpha_3: a3,
      iso_alpha_2: a2,
    });
    const COL = country(170, 'Colombia', 'COL', 'CO');
    const KEN = country(404, 'Kenya', 'KEN', 'KE');

    const geoFor = (scope: number, countries: unknown[]) =>
      builder.build(
        baseAggregate({ geo_scope_id: scope, countries: countries as never }),
      ).geo_focus as Record<string, unknown>;

    // --- National / Multi-national reconciled against the country count --------
    // CONFIRMED by PRMS (2026-09-21): it rejected scope_code 3 carrying a single
    // country. Unlike the cardinality rules removed the same day, this is not an
    // assumption -- so STAR emits a scope that matches the data instead of
    // refusing, and does NOT fabricate a country to justify the chosen scope.

    it('sends scope 4 (National) when a scope-3 result holds ONE country', () => {
      const geo = geoFor(ClarisaGeoScopeEnum.MULTI_NATIONAL, [KEN]);

      expect(geo.scope_code).toBe(ClarisaGeoScopeEnum.NATIONAL);
      expect(geo.scope_label).toBe('National');
      // The country is still exactly the one STAR holds -- no second invented.
      expect(geo.countries).toHaveLength(1);
    });

    it('sends scope 3 (Multi-national) when a scope-4 result holds TWO countries', () => {
      const geo = geoFor(ClarisaGeoScopeEnum.NATIONAL, [COL, KEN]);

      expect(geo.scope_code).toBe(ClarisaGeoScopeEnum.MULTI_NATIONAL);
      expect(geo.scope_label).toBe('Multi-national');
      expect(geo.countries).toHaveLength(2);
    });

    it('leaves a scope-3 result with ZERO countries alone -- nothing to reconcile with', () => {
      // Deliberately NOT normalised to 4: that would be a fresh guess, and PRMS
      // is the one that answers it.
      const geo = geoFor(ClarisaGeoScopeEnum.MULTI_NATIONAL, []);

      expect(geo.scope_code).toBe(ClarisaGeoScopeEnum.MULTI_NATIONAL);
      expect('countries' in geo).toBe(false);
    });

    // --- Global / TBD carry their companion geography (2026-09-21) -----------
    // These scopes used to drop regions, countries and sub-nationals silently, so
    // a global result with countries recorded in STAR reached PRMS with none.

    it('sends countries AND regions on a Global result that has them', () => {
      const geo = builder.build(
        baseAggregate({
          geo_scope_id: ClarisaGeoScopeEnum.GLOBAL,
          countries: [COL, KEN] as never,
          regions: [{ um49code: 2, name: 'Africa' }] as never,
        }),
      ).geo_focus as Record<string, unknown>;

      expect(geo.scope_code).toBe(ClarisaGeoScopeEnum.GLOBAL);
      expect(geo.scope_label).toBe('Global');
      expect(geo.countries).toHaveLength(2);
      expect(geo.regions).toEqual([{ um49code: 2, name: 'Africa' }]);
    });

    it('does NOT reclassify a Global result that carries two countries', () => {
      // The National/Multi-national reconciliation must not reach Global: the
      // country count says nothing about whether a result is global.
      const geo = builder.build(
        baseAggregate({
          geo_scope_id: ClarisaGeoScopeEnum.GLOBAL,
          countries: [COL, KEN] as never,
        }),
      ).geo_focus as Record<string, unknown>;

      expect(geo.scope_code).toBe(ClarisaGeoScopeEnum.GLOBAL);
    });

    it('sends companions on a yet-to-be-determined result too', () => {
      const geo = builder.build(
        baseAggregate({
          geo_scope_id: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
          countries: [KEN] as never,
        }),
      ).geo_focus as Record<string, unknown>;

      expect(geo.scope_code).toBe(
        ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
      );
      expect(geo.countries).toHaveLength(1);
    });

    it('a Global result with no geography stays byte-identical to before', () => {
      // Omitting-when-empty is what makes this change safe for every result that
      // has nothing to declare.
      const geo = builder.build(
        baseAggregate({ geo_scope_id: ClarisaGeoScopeEnum.GLOBAL }),
      ).geo_focus as Record<string, unknown>;

      expect(Object.keys(geo).sort()).toEqual(['scope_code', 'scope_label']);
    });

    it('never rewrites a scope OUTSIDE the National / Multi-national pair', () => {
      // Regional, Sub-national, Global and TBD are not a function of the country
      // count, so the count must not move them.
      expect(geoFor(ClarisaGeoScopeEnum.SUB_NATIONAL, [KEN]).scope_code).toBe(
        ClarisaGeoScopeEnum.SUB_NATIONAL,
      );
      expect(geoFor(ClarisaGeoScopeEnum.REGIONAL, [COL, KEN]).scope_code).toBe(
        ClarisaGeoScopeEnum.REGIONAL,
      );
      expect(geoFor(ClarisaGeoScopeEnum.GLOBAL, [COL, KEN]).scope_code).toBe(
        ClarisaGeoScopeEnum.GLOBAL,
      );
    });

    it('OMITS the collection when a scope has no companion rows, rather than sending []', () => {
      // `[]` would assert "we checked and there are none"; omitting says "we are
      // not declaring this". PRMS decides which it wants.
      const aggregate = baseAggregate({
        geo_scope_id: ClarisaGeoScopeEnum.MULTI_NATIONAL,
        countries: [],
      });

      const geo = builder.build(aggregate).geo_focus as Record<string, unknown>;

      expect(geo.scope_code).toBe(ClarisaGeoScopeEnum.MULTI_NATIONAL);
      expect('countries' in geo).toBe(false);
    });

    it('still refuses a result with NO resolvable scope -- the one structural check kept', () => {
      // Without a scope there is no scope_code/scope_label to emit at all, so this
      // is not an assumption about PRMS; it is the field being unbuildable.
      const aggregate = baseAggregate({ geo_scope_id: 9999 as never });

      expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
      expect(() => builder.build(aggregate)).toThrow(/geo_focus/);
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
