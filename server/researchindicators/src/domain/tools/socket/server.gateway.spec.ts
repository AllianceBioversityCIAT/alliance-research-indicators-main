import {
  POOL_FUNDING_ALIGNMENT_CHANGED_EVENT,
  ServerGateway,
} from './server.gateway';

describe('ServerGateway', () => {
  it('emits pool funding alignment changed events with the documented name', () => {
    const gateway = new ServerGateway();
    const emit = jest.fn();
    gateway.server = { emit } as any;
    const payload = {
      result_code: '123',
      by_user_id: 9,
      at: '2026-05-19T13:00:00.000Z',
    };

    gateway.emitPoolFundingAlignmentChanged(payload);

    expect(emit).toHaveBeenCalledWith(
      POOL_FUNDING_ALIGNMENT_CHANGED_EVENT,
      payload,
    );
  });
});
