import { DeliveryModalityEnum } from '../../../../entities/delivery-modalities/enum/delivery-modalities.enum';

/**
 * Maps PRMS `delivery_method.name` to STAR {@link DeliveryModalityEnum}.
 *
 * Keys are the exact PRMS labels — do not normalize beyond a trim, or the
 * lookup will miss known values such as "Blended (in-person and virtual)".
 *
 * STAR seed names (`1731437701566-insertDeliveryModality`):
 * Virtual, Hybrid, In-person.
 */
export const DeliveryModalityHomologation: Record<
  string,
  DeliveryModalityEnum
> = {
  'Virtual / Online': DeliveryModalityEnum.VIRTUAL,
  'Blended (in-person and virtual)': DeliveryModalityEnum.HYBRID,
  'In person': DeliveryModalityEnum.IN_PERSON,
};
