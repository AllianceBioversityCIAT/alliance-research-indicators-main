import { DeliveryProcessingState } from './delivery-processing-state.enum';

describe('DeliveryProcessingState', () => {
  it('holds exactly the three design.md §4 members', () => {
    expect(DeliveryProcessingState).toEqual({
      RECEIVED: 'RECEIVED',
      PROCESSED: 'PROCESSED',
      PROCESSING_FAILED: 'PROCESSING_FAILED',
    });
  });
});
