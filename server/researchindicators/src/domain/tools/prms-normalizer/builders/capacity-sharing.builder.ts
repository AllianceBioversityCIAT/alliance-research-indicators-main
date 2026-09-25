import { Injectable } from '@nestjs/common';
import { GenderEnum } from '../../../entities/genders/enums/gender.enum';
import { SessionFormatEnum } from '../../../entities/session-formats/enums/session-format.enum';
import { DeliveryModalityEnum } from '../../../entities/delivery-modalities/enum/delivery-modalities.enum';
import { DegreesEnum } from '../../../entities/degrees/enum/degrees.enum';
import { SessionLengthEnum } from '../../../entities/session-lengths/enum/session-lengths.enum';
import { DeliveryModalityHomologation } from '../../open-search/prms/homologation/delivery-modality.homologation';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { homologateLengthTraining } from '../homologation/length-training.homologation';
import { PrmsPayloadBuildError } from './common-fields.builder';

/**
 * Invert the inbound DeliveryModalityHomologation (homologation.md §7 / §12).
 * Expected PRMS labels live in that document; this lookup must not invent new ones.
 */
const invertDeliveryMethod = (id: DeliveryModalityEnum): string => {
  const found = Object.entries(DeliveryModalityHomologation).find(
    ([, value]) => value === id,
  );
  if (!found) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'delivery_method'`,
      'delivery_method',
    );
  }
  return found[0];
};

const asEnteredCount = (value: unknown): number | undefined => {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The `number_people_trained` buckets, keyed by the seeded `gender` catalogue so
 * the ids never appear as literals at the call site.
 */
const GENDER_BUCKET: Partial<Record<GenderEnum, string>> = {
  [GenderEnum.MALE]: 'men',
  [GenderEnum.FEMALE]: 'women',
  [GenderEnum.NON_BINARY]: 'non_binary',
};

@Injectable()
export class CapacitySharingBuilder {
  /**
   * Type-specific block nested at `capacity_sharing` (D-B / homologation.md §7).
   * Common fields stay on T-06; this builder does not emit them.
   */
  build(aggregate: PrmsSyncAggregate): Record<string, unknown> {
    const slice = aggregate.type_slices?.capacity_sharing;
    if (!slice) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'capacity_sharing'`,
        'capacity_sharing',
      );
    }

    const degreeId = slice.degree_id as DegreesEnum | null | undefined;
    const sessionLengthId = slice.session_length_id as
      | SessionLengthEnum
      | null
      | undefined;
    // A degree is NOT required: a non-degree training legitimately has none, and
    // the homologation already falls through to the session-length term for BSc
    // and Other. Requiring it here threw before the homologation could decide.
    // PRMS receives one string enum ("Short-term"), never a degree id — so the
    // only real failure is when neither input can produce that string, which the
    // `!lengthTraining` guard below catches (e.g. PhD still resolves with no
    // session length, and a null degree resolves from the session length alone).

    const deliveryModalityId = slice.delivery_modality_id as
      | DeliveryModalityEnum
      | null
      | undefined;
    if (deliveryModalityId == null) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'delivery_method'`,
        'delivery_method',
      );
    }

    const women = asEnteredCount(slice.session_participants_female);
    const men = asEnteredCount(slice.session_participants_male);
    const nonBinary = asEnteredCount(slice.session_participants_non_binary);
    const numberPeopleTrained: Record<string, number> = {};
    if (women !== undefined) {
      numberPeopleTrained.women = women;
    }
    if (men !== undefined) {
      numberPeopleTrained.men = men;
    }
    if (nonBinary !== undefined) {
      numberPeopleTrained.non_binary = nonBinary;
    }
    // An INDIVIDUAL training records one named trainee and their gender instead of
    // the disaggregated counts a group training carries — measured on Dev, all 42
    // approved individual versions have `gender_id` and 39 have no counts at all,
    // so the group shape alone could never send a third of Approved CapDev.
    // Counting that trainee as 1 is not the `unknown` arithmetic §1.4 rejected:
    // the participant and their gender were both entered by a person.
    if (
      Object.keys(numberPeopleTrained).length === 0 &&
      (slice.session_format_id as SessionFormatEnum | null | undefined) ===
        SessionFormatEnum.INDIVIDUAL
    ) {
      const bucket = GENDER_BUCKET[slice.gender_id as GenderEnum];
      if (bucket) {
        // All three buckets are filled, not just the trainee's. PRMS rejects an
        // absent `women` ("must be a number conforming to the specified
        // constraints", measured 2026-09-16 on a payload carrying only `men`),
        // and for ONE participant of a known gender the other two counts are
        // entailed with certainty rather than inferred — which is what separates
        // this from the group case, where an unreported count is not a zero.
        for (const known of Object.values(GENDER_BUCKET)) {
          numberPeopleTrained[known] = 0;
        }
        numberPeopleTrained[bucket] = 1;
      }
    }

    if (Object.keys(numberPeopleTrained).length === 0) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'number_people_trained'`,
        'number_people_trained',
      );
    }

    // PRMS rejects an absent bucket rather than treating it as optional
    // ("women must be a number conforming to the specified constraints",
    // measured 2026-09-16 against a payload carrying only `men`), so every bucket
    // the reporter left blank is sent as 0. Product decision of 2026-09-16: for a
    // GROUP training this does assert a zero the reporter never typed, which is
    // why it only applies once at least one count exists — a group that reported
    // nothing at all still refuses above rather than claiming nobody was trained.
    for (const bucket of Object.values(GENDER_BUCKET)) {
      if (numberPeopleTrained[bucket] === undefined) {
        numberPeopleTrained[bucket] = 0;
      }
    }

    const lengthTraining = homologateLengthTraining(degreeId, sessionLengthId);
    if (!lengthTraining) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'length_training'`,
        'length_training',
      );
    }

    return {
      capacity_sharing: {
        number_people_trained: numberPeopleTrained,
        length_training: lengthTraining,
        delivery_method: invertDeliveryMethod(deliveryModalityId),
      },
    };
  }
}
