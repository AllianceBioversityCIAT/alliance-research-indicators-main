import { DeliveryModalityEnum } from '../../../../entities/delivery-modalities/enum/delivery-modalities.enum';
import { DeliveryModalityHomologation } from './delivery-modality.homologation';

describe('DeliveryModalityHomologation', () => {
  it('maps exact PRMS delivery method names to STAR delivery modalities', () => {
    expect(DeliveryModalityHomologation['Virtual / Online']).toBe(
      DeliveryModalityEnum.VIRTUAL,
    );
    expect(
      DeliveryModalityHomologation['Blended (in-person and virtual)'],
    ).toBe(DeliveryModalityEnum.HYBRID);
    expect(DeliveryModalityHomologation['In person']).toBe(
      DeliveryModalityEnum.IN_PERSON,
    );
  });

  it('does not rewrite hyphens so blended keeps its PRMS spelling', () => {
    expect(
      DeliveryModalityHomologation['Blended (in person and virtual)'],
    ).toBeUndefined();
  });
});
