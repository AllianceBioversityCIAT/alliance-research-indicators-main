import { DeliveryCorrelationOutcome } from './delivery-correlation-outcome.enum';

describe('DeliveryCorrelationOutcome', () => {
  it('holds exactly the five design.md §4 members', () => {
    expect(DeliveryCorrelationOutcome).toEqual({
      CORRELATED: 'CORRELATED',
      UNKNOWN_REFERENCE: 'UNKNOWN_REFERENCE',
      NO_REFERENCE: 'NO_REFERENCE',
      MALFORMED: 'MALFORMED',
      DUPLICATE: 'DUPLICATE',
    });
  });
});
