import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { InnovationDevelopmentBuilder } from './innovation-development.builder';

/**
 * Expected typology / readiness keys are transcribed from homologation.md §6.
 * The `{ id, name }` readiness shape is a deliberate choice of that field
 * table, recorded here as UNPROVEN at the persistence layer: T-01 showed
 * schema tolerance only (`id`/`name`, `level`, and all three together were
 * accepted). No comment or assertion in this file treats that spike as having
 * settled which key PRMS stores.
 */
const serialize = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const emptySlices = {
  capacity_sharing: null,
  policy_change: null,
  innovation_use: null,
  actors: [] as Record<string, unknown>[],
  institution_types: [] as Record<string, unknown>[],
  quantifications: [] as Record<string, unknown>[],
};

const innovationAggregate = (
  slice: Record<string, unknown>,
): PrmsSyncAggregate => ({
  result_id: 9008,
  result_official_code: 1441071,
  indicator_id: 2,
  created_at: new Date('2024-03-01T10:00:00.000Z'),
  title: 'Innovation development type-block fixture',
  description: 'Type-specific payload for innovation_development',
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
  evidence: [],
  type_slices: {
    ...emptySlices,
    innovation_dev: slice,
  },
});

const baseSlice = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  innovation_type: {
    code: 4,
    name: 'Production systems and management practices',
  },
  innovation_readiness: {
    id: 4,
    name: 'Available',
    level: 4,
  },
  ...overrides,
});

describe('InnovationDevelopmentBuilder', () => {
  const builder = new InnovationDevelopmentBuilder();

  it('nests type-specific fields under innovation_development (homologation.md §6 D-B)', () => {
    const payload = serialize(builder.build(innovationAggregate(baseSlice())));
    expect(payload).toHaveProperty('innovation_development');
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('geo_focus');
  });

  it('sends innovation_typology.code and name from clarisa_innovation_types (homologation.md §6, R-PRMS-005 AC.1)', () => {
    const payload = serialize(builder.build(innovationAggregate(baseSlice())));
    const block = payload.innovation_development as Record<string, unknown>;
    expect(block.innovation_typology).toEqual({
      code: 4,
      name: 'Production systems and management practices',
    });
  });

  it('sends innovation_readiness_level as id and name from the §6 field table (persistence unproven)', () => {
    const payload = serialize(builder.build(innovationAggregate(baseSlice())));
    const block = payload.innovation_development as Record<string, unknown>;
    const readiness = block.innovation_readiness_level as Record<
      string,
      unknown
    >;
    expect(readiness).toEqual({
      id: 4,
      name: 'Available',
    });
    expect(readiness).not.toHaveProperty('level');
  });

  it('omits innovation_developers from the serialized payload (homologation.md §1.4 / §6, R-PRMS-005 AC.3, P-1 / DC-5)', () => {
    const payload = serialize(builder.build(innovationAggregate(baseSlice())));
    const block = payload.innovation_development as Record<string, unknown>;
    expect(block).not.toHaveProperty('innovation_developers');
    expect(JSON.stringify(payload)).not.toMatch(/"innovation_developers"/);
    expect(JSON.stringify(payload)).not.toMatch(/"unknown"/);
  });
});
