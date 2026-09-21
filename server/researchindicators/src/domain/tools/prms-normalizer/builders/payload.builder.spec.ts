import { ActorRolesEnum } from '../../../entities/actor-roles/enum/actor-roles.enum';
import { DeliveryModalityEnum } from '../../../entities/delivery-modalities/enum/delivery-modalities.enum';
import { DegreesEnum } from '../../../entities/degrees/enum/degrees.enum';
import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';
import { InstitutionRolesEnum } from '../../../entities/institution-roles/enums/institution-roles.enum';
import { PolicyStagesEnum } from '../../../entities/policy-stages/enum/policy-stages.enum';
import { PolicyTypesEnum } from '../../../entities/policy-types/enum/policy-types.enum';
import { QuantificationRolesEnum } from '../../../entities/quantification-roles/enum/quantification-roles.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { ClarisaGeoScopeEnum } from '../../clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import {
  PrmsSyncAggregate,
  PrmsSyncTypeSlices,
} from '../dto/prms-sync-aggregate';
import {
  PrmsPolicyTypeEnum,
  PolicyTypeHomologation,
} from '../../open-search/prms/homologation/policy-type.homologation';
import {
  CommonFieldsBuilder,
  PrmsPayloadBuildError,
} from './common-fields.builder';
import { CapacitySharingBuilder } from './capacity-sharing.builder';
import { InnovationDevelopmentBuilder } from './innovation-development.builder';
import { InnovationUseBuilder } from './innovation-use.builder';
import { KnowledgeProductBuilder } from './knowledge-product.builder';
import { PolicyChangeBuilder } from './policy-change.builder';
import { PayloadBuilder } from './payload.builder';

const ADA = {
  email: 'ada.lovelace@cgiar.org',
  first_name: 'Ada',
  last_name: 'Lovelace',
};

const CREATED_AT = new Date('2024-03-01T10:00:00.000Z');
const SUBMITTED_AT = new Date('2025-06-15T14:30:00.000Z');

const emptySlices = (): PrmsSyncTypeSlices => ({
  capacity_sharing: null,
  innovation_dev: null,
  policy_change: null,
  innovation_use: null,
  actors: [],
  institution_types: [],
  quantifications: [],
});

const implementingOrg = {
  institution_id: 46,
  acronym: 'ABC RH - CIAT (Alliance)',
  name: 'Alliance of Bioversity and CIAT',
  institution_role_id: InstitutionRolesEnum.POLICY_CHANGE,
};

const capacitySlice = {
  session_participants_female: 3,
  session_participants_male: 2,
  session_participants_non_binary: 0,
  degree_id: DegreesEnum.OTHER,
  session_length_id: SessionLengthEnum.SHORT_TERM,
  delivery_modality_id: DeliveryModalityEnum.VIRTUAL,
};

const innovationDevSlice = {
  innovation_type: {
    code: 4,
    name: 'Production systems and management practices',
  },
  innovation_readiness: {
    id: 4,
    name: 'Available',
    level: 4,
  },
};

const policyType1Slice = {
  policy_type_id: PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT,
  policy_stage_id: PolicyStagesEnum.STAGE_1,
  implementing_organizations: [implementingOrg],
};

const innovationUseSlices = (): Partial<PrmsSyncTypeSlices> => ({
  innovation_use: { innovation_use_level_id: 3 },
  actors: [
    {
      result_actors_id: 101,
      actor_type_id: 2,
      actor_role_id: ActorRolesEnum.INNOVATION_USE,
      sex_age_disaggregation_not_apply: false,
      women_youth_count: 2,
      women_not_youth_count: 5,
      men_youth_count: 1,
      men_not_youth_count: 3,
    },
  ],
  quantifications: [
    {
      unit: 'hectares',
      quantification_number: 12,
      quantification_role_id: QuantificationRolesEnum.INNOVATION_USE,
    },
  ],
});

const completeAggregate = (
  overrides: Partial<PrmsSyncAggregate> = {},
): PrmsSyncAggregate => ({
  result_id: 9009,
  result_official_code: 1441080,
  indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
  created_at: CREATED_AT,
  title: 'Payload builder assembly fixture',
  description: 'Envelope assembly for T-09',
  geo_scope_id: ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED,
  is_partner_not_applicable: true,
  created_by: ADA,
  submitted_by: {
    staff: ADA,
    submitted_date: SUBMITTED_AT,
    comment: null,
  },
  lead_contact: ADA,
  primary_contract: {
    agreement_id: 'D-1441080',
    description: 'Assembly grant',
    ubwClientDescription: 'ExCIAT',
    is_primary: true,
  },
  contracts: [],
  science_programs: [
    {
      sp_code: 'SP01',
      sp_role: 'PRIMARY',
      toc_result_title: null,
      indicator_description: null,
      aligns_with_toc: true,
    },
  ],
  regions: [],
  countries: [],
  subnational_areas: [],
  partners: [],
  evidence: [],
  type_slices: {
    ...emptySlices(),
    capacity_sharing: capacitySlice,
  },
  ...overrides,
});

const serialize = (payload: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

describe('PayloadBuilder', () => {
  const builder = new PayloadBuilder(
    new CommonFieldsBuilder(),
    new CapacitySharingBuilder(),
    new InnovationDevelopmentBuilder(),
    new PolicyChangeBuilder(),
    new InnovationUseBuilder(),
    new KnowledgeProductBuilder(),
  );

  const envelopeOf = (aggregate: PrmsSyncAggregate) =>
    serialize(builder.build(aggregate));

  const resultOf = (aggregate: PrmsSyncAggregate) => {
    const envelope = envelopeOf(aggregate);
    const results = envelope.results as Array<Record<string, unknown>>;
    return results[0];
  };

  describe('envelope constants (homologation.md §2 Envelope)', () => {
    it('emits tenant and op transcribed from the §2 table, not from memory', () => {
      const envelope = envelopeOf(completeAggregate());

      expect(envelope.tenant).toBe('prms.result-management.api');
      expect(envelope.op).toBe('dataset.ingest.requested');
      expect(Array.isArray(envelope.results)).toBe(true);
      expect(envelope.results).toHaveLength(1);
    });
  });

  describe('assembly merge (homologation.md §2 D-B)', () => {
    it('keeps common fields flat at data and nests the type block once', () => {
      const row = resultOf(completeAggregate());
      const data = row.data as Record<string, unknown>;

      expect(row.type).toBe('capacity_sharing');
      expect(data.external_reference).toBe('1441080');
      expect(data).toHaveProperty('capacity_sharing');
      expect(data).not.toHaveProperty('innovation_development');
      expect(
        (data.capacity_sharing as Record<string, unknown>).capacity_sharing,
      ).toBeUndefined();
    });
  });

  describe('all four type builders reachable, including the gated two (R-PRMS-002, R-F6)', () => {
    it('builds Capacity Sharing (ungated)', () => {
      const row = resultOf(
        completeAggregate({
          indicator_id: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          type_slices: {
            ...emptySlices(),
            capacity_sharing: capacitySlice,
          },
        }),
      );
      const data = row.data as Record<string, unknown>;
      expect(row.type).toBe('capacity_sharing');
      expect(data).toHaveProperty('capacity_sharing');
    });

    it('builds Innovation Development (ungated)', () => {
      const row = resultOf(
        completeAggregate({
          indicator_id: IndicatorsEnum.INNOVATION_DEV,
          type_slices: {
            ...emptySlices(),
            innovation_dev: innovationDevSlice,
          },
        }),
      );
      const data = row.data as Record<string, unknown>;
      expect(row.type).toBe('innovation_development');
      expect(data).toHaveProperty('innovation_development');
      expect(
        (data.innovation_development as Record<string, unknown>)
          .innovation_development,
      ).toBeUndefined();
    });

    it('builds Innovation Use through this builder (gated at the endpoint, not here)', () => {
      const row = resultOf(
        completeAggregate({
          indicator_id: IndicatorsEnum.INNOVATION_USE,
          type_slices: {
            ...emptySlices(),
            ...innovationUseSlices(),
          },
        }),
      );
      const data = row.data as Record<string, unknown>;
      expect(row.type).toBe('innovation_use');
      expect(data).toHaveProperty('innovation_use');
      expect(
        (data.innovation_use as Record<string, unknown>).innovation_use,
      ).toBeUndefined();
    });

    it('builds a PRMS policy-type-1 payload (Program, Budget, or Investment) through this builder (gated at the endpoint, not here)', () => {
      expect(PrmsPolicyTypeEnum.PROGRAM_BUDGET_OR_INVESTMENT).toBe(1);
      expect(
        PolicyTypeHomologation[PrmsPolicyTypeEnum.PROGRAM_BUDGET_OR_INVESTMENT],
      ).toBe(PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT);

      const row = resultOf(
        completeAggregate({
          indicator_id: IndicatorsEnum.POLICY_CHANGE,
          type_slices: {
            ...emptySlices(),
            policy_change: policyType1Slice,
          },
        }),
      );
      const data = row.data as Record<string, unknown>;
      const block = data.policy_change as Record<string, unknown>;
      const policyType = block.policy_type as Record<string, unknown>;

      expect(row.type).toBe('policy_change');
      expect(data).toHaveProperty('policy_change');
      expect(block.policy_change).toBeUndefined();
      expect(policyType.name).toBe('Program, Budget, or Investment');
    });

    it('routes Knowledge Product (indicator_id 3) to the knowledge_product builder', () => {
      const row = resultOf(
        completeAggregate({
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
          evidence: [
            {
              link: 'https://doi.org/10.1007/s10668-024-05173-5',
              description: 'DOI',
              is_private: false,
            },
            {
              link: 'https://hdl.handle.net/10568/148990',
              description: 'Handled',
              is_private: false,
            },
          ],
        }),
      );
      const data = row.data as Record<string, unknown>;
      const block = data.knowledge_product as Record<string, unknown>;

      expect(row.type).toBe('knowledge_product');
      expect(data).toHaveProperty('knowledge_product');
      expect(block).toEqual({
        handle: 'https://hdl.handle.net/10568/148990',
      });
      expect(block.handle).not.toBe(
        'https://doi.org/10.1007/s10668-024-05173-5',
      );
    });
  });

  describe('unmappable indicator_id raises (homologation.md §3, R-PRMS-002 AC.1)', () => {
    const expectUnmappable = (indicatorId: number) => {
      const aggregate = completeAggregate({ indicator_id: indicatorId });
      expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
      expect(() => builder.build(aggregate)).toThrow(
        `Unmappable indicator_id '${indicatorId}'`,
      );
    };

    it('raises for OICR (indicator_id 5) instead of returning undefined', () => {
      expectUnmappable(IndicatorsEnum.OICR);
    });

    it('raises for an indicator_id outside 1–6 instead of emitting type: undefined', () => {
      expectUnmappable(7);
    });
  });
});
