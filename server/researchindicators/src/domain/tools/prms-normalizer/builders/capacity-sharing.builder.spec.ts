import { DegreesEnum } from '../../../entities/degrees/enum/degrees.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { DeliveryModalityEnum } from '../../../entities/delivery-modalities/enum/delivery-modalities.enum';
import { GenderEnum } from '../../../entities/genders/enums/gender.enum';
import { SessionFormatEnum } from '../../../entities/session-formats/enums/session-format.enum';
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

    /**
     * Measured on Dev: result 19949 and its Approved version both carry
     * degree_id NULL with session_length_id set — a non-degree training, which is
     * the ordinary case, not a broken row. The builder used to throw
     * "Missing mandatory field 'length_training'" before the homologation could
     * decide, so no such training could ever be sent. PRMS receives one string
     * enum; a degree is not one of its fields.
     */
    it('builds from the session length alone when no degree is recorded', () => {
      const shortTerm = builtBlock(
        builder,
        baseSlice({
          degree_id: null,
          session_length_id: SessionLengthEnum.SHORT_TERM,
        }),
      );
      const longTerm = builtBlock(
        builder,
        baseSlice({
          degree_id: null,
          session_length_id: SessionLengthEnum.LONG_TERM,
        }),
      );
      expect(shortTerm.length_training).toBe('Short-term');
      expect(longTerm.length_training).toBe('Long-term');
    });

    it('still refuses when neither a degree nor a session length can produce the enum', () => {
      expect(() =>
        builder.build(
          capacityAggregate(
            baseSlice({ degree_id: null, session_length_id: null }),
          ),
        ),
      ).toThrow("Missing mandatory field 'length_training'");
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

  describe('individual training (session_format_id = INDIVIDUAL)', () => {
    /**
     * Measured on Dev: of 126 Approved CapDev versions, 42 are individual and ALL
     * 42 carry gender_id while 39 carry no counts at all. The group shape alone
     * therefore excluded a third of Approved CapDev from PRMS permanently.
     * Expected buckets transcribed from the seeded `gender` catalogue
     * (1 Male, 2 Female, 3 Non-binary), not from builder output (DC-1).
     */
    const individualSlice = (genderId: GenderEnum | null) =>
      baseSlice({
        session_format_id: SessionFormatEnum.INDIVIDUAL,
        gender_id: genderId,
        session_participants_female: null,
        session_participants_male: null,
        session_participants_non_binary: null,
      });

    it.each([
      [GenderEnum.MALE, 'men'],
      [GenderEnum.FEMALE, 'women'],
      [GenderEnum.NON_BINARY, 'non_binary'],
    ])(
      'counts the single trainee of gender %i under %s',
      (genderId, bucket) => {
        const block = builtBlock(builder, individualSlice(genderId));
        const trained = block.number_people_trained as Record<string, unknown>;

        // PRMS rejects an absent `women`, and for a single participant of a known
        // gender the other two counts are entailed, not invented.
        const expected: Record<string, number> = {
          women: 0,
          men: 0,
          non_binary: 0,
        };
        expected[bucket] = 1;
        expect(trained).toEqual(expected);
        // never the arithmetic artefact §1.4 rejected
        expect(trained).not.toHaveProperty('unknown');
      },
    );

    it('still refuses an individual training whose trainee has no gender', () => {
      expect(() =>
        builder.build(capacityAggregate(individualSlice(null))),
      ).toThrow("Missing mandatory field 'number_people_trained'");
    });

    it('never invents a trainee for a GROUP training that recorded no counts', () => {
      expect(() =>
        builder.build(
          capacityAggregate(
            baseSlice({
              session_format_id: SessionFormatEnum.GROUP,
              gender_id: GenderEnum.MALE,
              session_participants_female: null,
              session_participants_male: null,
              session_participants_non_binary: null,
            }),
          ),
        ),
      ).toThrow("Missing mandatory field 'number_people_trained'");
    });

    it('leaves entered counts untouched when an individual training has them', () => {
      const block = builtBlock(
        builder,
        baseSlice({
          session_format_id: SessionFormatEnum.INDIVIDUAL,
          gender_id: GenderEnum.FEMALE,
        }),
      );
      const trained = block.number_people_trained as Record<string, unknown>;

      expect(trained).toEqual({ women: 3, men: 2, non_binary: 0 });
    });
  });

  describe('group training with partial counts (product decision 2026-09-16)', () => {
    /**
     * Measured on Dev: 50 of 84 Approved group versions report only some buckets,
     * and PRMS rejects an absent one outright. The blanks are therefore sent as 0.
     * This DOES assert a zero nobody typed — accepted deliberately by the product
     * owner; recorded here so the trade-off is visible rather than implicit.
     */
    it('fills the buckets left blank with 0 once at least one count exists', () => {
      const block = builtBlock(
        builder,
        baseSlice({
          session_format_id: SessionFormatEnum.GROUP,
          session_participants_female: null,
          session_participants_male: 20,
          session_participants_non_binary: null,
        }),
      );

      expect(block.number_people_trained).toEqual({
        women: 0,
        men: 20,
        non_binary: 0,
      });
    });

    it('never claims nobody was trained when the group reported no counts at all', () => {
      expect(() =>
        builder.build(
          capacityAggregate(
            baseSlice({
              session_format_id: SessionFormatEnum.GROUP,
              session_participants_female: null,
              session_participants_male: null,
              session_participants_non_binary: null,
            }),
          ),
        ),
      ).toThrow("Missing mandatory field 'number_people_trained'");
    });

    it('sends every bucket as a number, never omitting one, so PRMS cannot reject an absent key', () => {
      const block = builtBlock(
        builder,
        baseSlice({ session_format_id: SessionFormatEnum.GROUP }),
      );
      const trained = block.number_people_trained as Record<string, unknown>;

      for (const key of ['women', 'men', 'non_binary']) {
        expect(typeof trained[key]).toBe('number');
      }
      expect(trained).not.toHaveProperty('unknown');
    });
  });
});
