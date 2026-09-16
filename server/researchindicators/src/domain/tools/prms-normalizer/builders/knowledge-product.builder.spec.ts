import { HttpStatus } from '@nestjs/common';
import { IndicatorsEnum } from '../../../entities/indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../../../entities/result-status/enum/result-status.enum';
import {
  evaluateSyncGate,
  SyncGateSnapshot,
} from '../../../entities/result-prms-sync/eligibility/sync-gate';
import {
  PrmsEvidenceSnapshot,
  PrmsSyncAggregate,
} from '../dto/prms-sync-aggregate';
import { PrmsPayloadBuildError } from './common-fields.builder';
import { KnowledgeProductBuilder } from './knowledge-product.builder';

const HANDLE_URL = 'https://hdl.handle.net/10568/148990';
const DOI_URL = 'https://doi.org/10.1007/s10668-024-05173-5';

const serialize = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const emptySlices = {
  capacity_sharing: null,
  innovation_dev: null,
  policy_change: null,
  innovation_use: null,
  actors: [] as Record<string, unknown>[],
  institution_types: [] as Record<string, unknown>[],
  quantifications: [] as Record<string, unknown>[],
};

const kpAggregate = (evidence: PrmsEvidenceSnapshot[]): PrmsSyncAggregate => ({
  result_id: 8741,
  result_official_code: 10855,
  indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
  created_at: new Date('2024-03-01T10:00:00.000Z'),
  title: 'Knowledge product type-block fixture',
  description: 'Type-specific payload for knowledge_product',
  geo_scope_id: 1,
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
  evidence,
  type_slices: emptySlices,
});

const handledRow = (
  overrides: Partial<PrmsEvidenceSnapshot> = {},
): PrmsEvidenceSnapshot => ({
  link: HANDLE_URL,
  description: 'Handled',
  is_private: false,
  ...overrides,
});

const doiRow = (
  overrides: Partial<PrmsEvidenceSnapshot> = {},
): PrmsEvidenceSnapshot => ({
  link: DOI_URL,
  description: 'DOI',
  is_private: false,
  ...overrides,
});

const otherwiseEligibleKp = (): SyncGateSnapshot => ({
  exists: true,
  is_synced_to_prms: false,
  result_status_id: ResultStatusEnum.APPROVED,
  pool_funding_alignment_green: true,
  primary_contract: {
    agreement_id: 'C-POOL-001',
    is_pool_funding_contributor: true,
  },
  indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
  prms_policy_type_id: null,
});

describe('KnowledgeProductBuilder', () => {
  const builder = new KnowledgeProductBuilder();

  it('emits exactly { knowledge_product: { handle } } and nothing else', () => {
    const payload = serialize(
      builder.build(kpAggregate([handledRow(), doiRow()])),
    );

    expect(payload).toEqual({
      knowledge_product: { handle: HANDLE_URL },
    });
    expect(Object.keys(payload)).toEqual(['knowledge_product']);
    expect(
      Object.keys(payload.knowledge_product as Record<string, unknown>),
    ).toEqual(['handle']);
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('geo_focus');
  });

  it('takes the handle from the "Handled" row and NOT from the "DOI" row when both are present', () => {
    const payload = serialize(
      builder.build(kpAggregate([doiRow(), handledRow()])),
    );
    const block = payload.knowledge_product as Record<string, unknown>;

    expect(block.handle).toBe(HANDLE_URL);
    expect(block.handle).not.toBe(DOI_URL);
    expect(JSON.stringify(payload)).not.toContain(DOI_URL);
  });

  it('fails loud when the "Handled" evidence row is absent', () => {
    const aggregate = kpAggregate([doiRow()]);

    expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
    expect(() => builder.build(aggregate)).toThrow(
      `Missing mandatory field 'handle'`,
    );

    expect.assertions(5);
    try {
      builder.build(aggregate);
    } catch (error) {
      expect(error).toBeInstanceOf(PrmsPayloadBuildError);
      expect((error as PrmsPayloadBuildError).field).toBe('handle');
      expect((error as PrmsPayloadBuildError).message).toBe(
        `Missing mandatory field 'handle'`,
      );
    }
  });

  it('does not match a description that differs only in case or whitespace — "Handled" match is exact', () => {
    const nearMisses: PrmsEvidenceSnapshot[] = [
      handledRow({ description: 'handled' }),
      handledRow({ description: 'HANDLED' }),
      handledRow({ description: ' Handle' }),
      handledRow({ description: 'Handled ' }),
      handledRow({ description: 'Handle' }),
      doiRow(),
    ];
    const aggregate = kpAggregate(nearMisses);

    expect(() => builder.build(aggregate)).toThrow(PrmsPayloadBuildError);
    expect(() => builder.build(aggregate)).toThrow(
      `Missing mandatory field 'handle'`,
    );
  });

  it('still refuses indicator 3 at the gate even when the builder can map it', () => {
    const decision = evaluateSyncGate(otherwiseEligibleKp());

    expect(decision.allowed).toBe(false);
    expect(decision.entryId).toBe('indicator_mappable');
    expect(decision.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(decision.description).toMatch(/Knowledge Product/i);
  });
});
