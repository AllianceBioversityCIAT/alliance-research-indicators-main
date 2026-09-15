import { Injectable } from '@nestjs/common';
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
    if (degreeId == null || sessionLengthId == null) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'length_training'`,
        'length_training',
      );
    }

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
    if (Object.keys(numberPeopleTrained).length === 0) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'number_people_trained'`,
        'number_people_trained',
      );
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
