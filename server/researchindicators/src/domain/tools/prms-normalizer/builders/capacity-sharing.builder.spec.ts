import { DegreesEnum } from '../../../entities/degrees/enum/degrees.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { DeliveryModalityEnum } from '../../../entities/delivery-modalities/enum/delivery-modalities.enum';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { CapacitySharingBuilder } from './capacity-sharing.builder';

/**
 * Expected `length_training` / `delivery_method` literals are transcribed from
 * homologation.md §7 and §12.2 — not from builder output (DC-1).
 *
 * §12.2 lossy inverse (R-PRMS-004 AC.2): BSc and Other have no PRMS slot, so they
 * fall through to the session term. A BSc long course and a non-degree long
 * course therefore become indistinguishable in PRMS. That lossiness is accepted;
 * this suite records it, it does not invent a BSc value.
 */
const serialize = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const emptySlices = {
  innovation_dev: null,
  policy_change: null,
  innovation_use: null,
  actors: [] as Record<string, unknown>[],
  institution_types: [] as Record<string, unknown>[],
  quantifications: [] as Record<string, unknown>[],
};

const capacityAggregate = (
  slice: Record<string, unknown>,
): PrmsSyncAggregate => ({
  result_id: 9007,
  result_official_code: 1441070,
  indicator_id: 1,
  created_at: new Date('2024-03-01T10:00:00.000Z'),
  title: 'Capacity sharing type-block fixture',
  description: 'Type-specific payload for capacity_sharing',
  geo_scope_id: 50,
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
    capacity_sharing: slice,
  },
});

const baseSlice = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  session_participants_female: 3,
  session_participants_male: 2,
  session_participants_non_binary: 0,
  degree_id: DegreesEnum.OTHER,
  session_length_id: SessionLengthEnum.SHORT_TERM,
  delivery_modality_id: DeliveryModalityEnum.VIRTUAL,
  ...overrides,
});

const builtBlock = (
  builder: CapacitySharingBuilder,
  slice: Record<string, unknown>,
): Record<string, unknown> => {
  const payload = serialize(builder.build(capacityAggregate(slice)));
  return payload.capacity_sharing as Record<string, unknown>;
};

describe('CapacitySharingBuilder', () => {
  const builder = new CapacitySharingBuilder();

  it('nests type-specific fields under capacity_sharing (homologation.md §7 D-B)', () => {
    const payload = serialize(builder.build(capacityAggregate(baseSlice())));
    expect(payload).toHaveProperty('capacity_sharing');
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('geo_focus');
  });

  describe('length_training (homologation.md §7 / §12.2, R-PRMS-004 AC.1–2)', () => {
    it.each([
      [DegreesEnum.PHD, SessionLengthEnum.SHORT_TERM, 'PhD'],
      [DegreesEnum.PHD, SessionLengthEnum.LONG_TERM, 'PhD'],
      [DegreesEnum.MSC, SessionLengthEnum.SHORT_TERM, 'Master'],
      [DegreesEnum.MSC, SessionLengthEnum.LONG_TERM, 'Master'],
      [DegreesEnum.BSC, SessionLengthEnum.SHORT_TERM, 'Short-term'],
      [DegreesEnum.BSC, SessionLengthEnum.LONG_TERM, 'Long-term'],
      [DegreesEnum.OTHER, SessionLengthEnum.SHORT_TERM, 'Short-term'],
      [DegreesEnum.OTHER, SessionLengthEnum.LONG_TERM, 'Long-term'],
    ])('degree %i × session %i → %s', (degreeId, sessionLengthId, expected) => {
      const block = builtBlock(
        builder,
        baseSlice({
          degree_id: degreeId,
          session_length_id: sessionLengthId,
        }),
      );
      expect(block.length_training).toBe(expected);
    });

    it('BSc + Long-term falls through to "Long-term" (homologation.md §12.2; indistinguishable from a non-degree long course in PRMS)', () => {
      const bscLong = builtBlock(
        builder,
        baseSlice({
          degree_id: DegreesEnum.BSC,
          session_length_id: SessionLengthEnum.LONG_TERM,
        }),
      );
      const otherLong = builtBlock(
        builder,
        baseSlice({
          degree_id: DegreesEnum.OTHER,
          session_length_id: SessionLengthEnum.LONG_TERM,
        }),
      );
      expect(bscLong.length_training).toBe('Long-term');
      expect(otherLong.length_training).toBe('Long-term');
    });
  });

  describe('delivery_method (homologation.md §7, inverted DeliveryModalityHomologation)', () => {
    it.each([
      [DeliveryModalityEnum.VIRTUAL, 'Virtual / Online'],
      [DeliveryModalityEnum.HYBRID, 'Blended (in-person and virtual)'],
      [DeliveryModalityEnum.IN_PERSON, 'In person'],
    ])('modality %i → %s', (deliveryModalityId, expected) => {
      const block = builtBlock(
        builder,
        baseSlice({ delivery_modality_id: deliveryModalityId }),
      );
      expect(block.delivery_method).toBe(expected);
    });
  });

  describe('number_people_trained (homologation.md §7, R-PRMS-004 AC.3, R-PRMS-008 AC.2)', () => {
    it('maps the three entered session_participants_* columns and omits unknown', () => {
      const payload = serialize(builder.build(capacityAggregate(baseSlice())));
      const block = payload.capacity_sharing as Record<string, unknown>;
      const trained = block.number_people_trained as Record<string, unknown>;
      expect(trained).toEqual({
        women: 3,
        men: 2,
        non_binary: 0,
      });
      expect(trained).not.toHaveProperty('unknown');
      expect(JSON.stringify(payload)).not.toMatch(/"unknown"/);
      expect(JSON.stringify(payload)).not.toMatch(/"innovation_developers"/);
    });
  });
});
