import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InstitutionRolesEnum } from '../../../entities/institution-roles/enums/institution-roles.enum';
import { PolicyStagesEnum } from '../../../entities/policy-stages/enum/policy-stages.enum';
import { PolicyTypesEnum } from '../../../entities/policy-types/enum/policy-types.enum';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { PrmsPayloadBuildError } from './common-fields.builder';
import { PolicyChangeBuilder } from './policy-change.builder';

/**
 * STAR policy type/stage names parsed from the seed migration
 * `1730993015550-insertLinkResultRole.ts` (homologation.md §9 / §12.1).
 * AUTO_INCREMENT order is the enum order (PolicyTypesEnum / PolicyStagesEnum).
 */
const SEEDED_POLICY_TYPE_NAMES: string[] = (() => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/db/migrations/1730993015550-insertLinkResultRole.ts',
    ),
    'utf8',
  );
  const line = source
    .split('\n')
    .find((entry) => entry.includes('INSERT INTO policy_types (name) VALUES'));
  if (!line) {
    throw new Error('Seeded policy_types INSERT not found');
  }
  return [...line.matchAll(/'([^']+)'/g)].map((match) => match[1]);
})();

const SEEDED_POLICY_STAGE_NAMES: string[] = (() => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/db/migrations/1730993015550-insertLinkResultRole.ts',
    ),
    'utf8',
  );
  const line = source
    .split('\n')
    .find((entry) =>
      entry.includes('INSERT INTO policy_stage (name, description) VALUES'),
    );
  if (!line) {
    throw new Error('Seeded policy_stage INSERT not found');
  }
  return [...line.matchAll(/'(Stage \d+)'/g)].map((match) => match[1]);
})();

const serialize = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const emptySlices = {
  capacity_sharing: null,
  innovation_dev: null,
  innovation_use: null,
  actors: [] as Record<string, unknown>[],
  institution_types: [] as Record<string, unknown>[],
  quantifications: [] as Record<string, unknown>[],
};

const implementingOrg = {
  institution_id: 46,
  acronym: 'ABC RH - CIAT (Alliance)',
  name: 'Alliance of Bioversity and CIAT',
  institution_role_id: InstitutionRolesEnum.POLICY_CHANGE,
};

const policyAggregate = (
  slice: Record<string, unknown>,
): PrmsSyncAggregate => ({
  result_id: 9003,
  result_official_code: 1441063,
  indicator_id: 4,
  created_at: new Date('2024-03-01T10:00:00.000Z'),
  title: 'Policy change type-block fixture',
  description: 'Type-specific payload for policy_change',
  geo_scope_id: 3,
  is_partner_not_applicable: false,
  created_by: null,
  submitted_by: null,
  lead_contact: null,
  primary_contract: null,
  contracts: [],
  science_programs: [],
  regions: [],
  countries: [],
  subnational_areas: [],
  partners: [],
  evidence: [],
  type_slices: {
    ...emptySlices,
    policy_change: slice,
  },
});

describe('PolicyChangeBuilder', () => {
  const builder = new PolicyChangeBuilder();

  const builtRoot = (slice: Record<string, unknown>): Record<string, unknown> =>
    serialize(builder.build(policyAggregate(slice)));

  const builtBlock = (
    slice: Record<string, unknown>,
  ): Record<string, unknown> =>
    builtRoot(slice).policy_change as Record<string, unknown>;

  describe('policy_type / policy_stage by name (homologation.md §12.1, DD-7, R-PRMS-006)', () => {
    it('sends Legal instrument and Stage 1 by seeded name, never id', () => {
      expect(
        SEEDED_POLICY_TYPE_NAMES[PolicyTypesEnum.LEGAL_INSTRUMENT - 1],
      ).toBe('Legal instrument');
      expect(SEEDED_POLICY_STAGE_NAMES[PolicyStagesEnum.STAGE_1 - 1]).toBe(
        'Stage 1',
      );

      const payload = builtBlock({
        policy_type_id: PolicyTypesEnum.LEGAL_INSTRUMENT,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        implementing_organizations: [implementingOrg],
      });

      expect(payload.policy_type).toEqual({ name: 'Legal instrument' });
      expect(payload.policy_stage).toEqual({ name: 'Stage 1' });
      expect(payload.policy_type).not.toHaveProperty('id');
      expect(payload.policy_stage).not.toHaveProperty('id');
    });

    it('sends Policy or Strategy by seeded name', () => {
      const payload = builtBlock({
        policy_type_id: PolicyTypesEnum.POLICY_OR_STRATEGY,
        policy_stage_id: PolicyStagesEnum.STAGE_2,
        implementing_organizations: [implementingOrg],
      });

      expect(payload.policy_type).toEqual({
        name: SEEDED_POLICY_TYPE_NAMES[PolicyTypesEnum.POLICY_OR_STRATEGY - 1],
      });
      expect(payload.policy_stage).toEqual({
        name: SEEDED_POLICY_STAGE_NAMES[PolicyStagesEnum.STAGE_2 - 1],
      });
    });
  });

  describe('status_amount / amount (homologation.md §9, R-PRMS-006 AC.2, DC-5)', () => {
    it('omits both keys on non-type-1 (Legal instrument) serialized JSON', () => {
      const payload = builtRoot({
        policy_type_id: PolicyTypesEnum.LEGAL_INSTRUMENT,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        implementing_organizations: [implementingOrg],
      });
      const json = JSON.stringify(payload);
      const block = payload.policy_change as Record<string, unknown>;
      const policyType = block.policy_type as Record<string, unknown>;

      expect(block).not.toHaveProperty('status_amount');
      expect(block).not.toHaveProperty('amount');
      expect(policyType).not.toHaveProperty('status_amount');
      expect(policyType).not.toHaveProperty('amount');
      expect(json).not.toContain('status_amount');
      expect(json).not.toContain('"amount"');
    });

    it('omits both keys on non-type-1 (Policy or Strategy) serialized JSON', () => {
      const payload = builtRoot({
        policy_type_id: PolicyTypesEnum.POLICY_OR_STRATEGY,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        implementing_organizations: [implementingOrg],
      });
      const json = JSON.stringify(payload);

      expect(json).not.toContain('status_amount');
      expect(json).not.toContain('"amount"');
    });
  });

  describe('implementing_organization (homologation.md §9, R-PRMS-006 AC.1)', () => {
    it('maps POLICY_CHANGE institutions and drops other roles', () => {
      const payload = builtBlock({
        policy_type_id: PolicyTypesEnum.LEGAL_INSTRUMENT,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        implementing_organizations: [
          implementingOrg,
          {
            institution_id: 12,
            acronym: 'FAO',
            name: 'Food and Agriculture Organization',
            institution_role_id: InstitutionRolesEnum.PARTNERS,
          },
        ],
      });

      expect(payload.implementing_organization).toEqual([
        {
          institutions_id: 46,
          institutions_acronym: 'ABC RH - CIAT (Alliance)',
          institutions_name: 'Alliance of Bioversity and CIAT',
        },
      ]);
      expect(JSON.stringify(payload)).not.toContain('"institutions_id":12');
    });

    it('refuses a result with no POLICY_CHANGE implementing organization', () => {
      const aggregate = policyAggregate({
        policy_type_id: PolicyTypesEnum.LEGAL_INSTRUMENT,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        implementing_organizations: [
          {
            institution_id: 12,
            acronym: 'FAO',
            name: 'Food and Agriculture Organization',
            institution_role_id: InstitutionRolesEnum.PARTNERS,
          },
        ],
      });

      expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
      expect(() => builder.build(aggregate)).toThrow(
        /implementing_organization/,
      );
    });
  });

  describe('P-1 omitted fields (homologation.md §1.4, DC-5)', () => {
    it('omits usd_budget, is_determined, innov_use_to_be_determined and evidence_stage', () => {
      const payload = builtRoot({
        policy_type_id: PolicyTypesEnum.LEGAL_INSTRUMENT,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        evidence_stage: 'should not be sent',
        implementing_organizations: [implementingOrg],
      });
      const json = JSON.stringify(payload);

      expect(json).not.toContain('usd_budget');
      expect(json).not.toContain('is_determined');
      expect(json).not.toContain('innov_use_to_be_determined');
      expect(json).not.toContain('evidence_stage');
      expect(json).not.toContain('should not be sent');
    });
  });

  describe('nesting (homologation.md §9 D-B, confirmed by T-01 spike 04)', () => {
    it('places the type-specific block under policy_change', () => {
      const payload = builtRoot({
        policy_type_id: PolicyTypesEnum.LEGAL_INSTRUMENT,
        policy_stage_id: PolicyStagesEnum.STAGE_1,
        implementing_organizations: [implementingOrg],
      });
      expect(Object.keys(payload)).toEqual(['policy_change']);
      expect(payload.policy_change).toHaveProperty('policy_type');
      expect(payload).not.toHaveProperty('policy_type');
    });
  });
});
