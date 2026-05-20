import { BadRequestException } from '@nestjs/common';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { BILATERAL_PUSH_REQUESTED_PATTERN } from './bilateral-push.constants';
import { BilateralPushConsumer } from './bilateral-push.consumer';
import { BilateralPushService } from './bilateral-push.service';

describe('BilateralPushConsumer', () => {
  let service: jest.Mocked<BilateralPushService>;
  let consumer: BilateralPushConsumer;

  beforeEach(() => {
    service = {
      handlePushRequested: jest.fn().mockResolvedValue({
        status: 'accepted',
        description: 'queued',
      }),
    } as unknown as jest.Mocked<BilateralPushService>;
    consumer = new BilateralPushConsumer(service);
  });

  it('listens to bilateral push requested queue events', () => {
    const patterns = Reflect.getMetadata(
      PATTERN_METADATA,
      consumer.handlePushRequested,
    );

    expect(patterns).toEqual([BILATERAL_PUSH_REQUESTED_PATTERN]);
  });

  it('passes object payloads to the service', async () => {
    const payload = {
      result_id: 77,
      result_code: '123',
      version_id: 2,
      requested_by: 9,
    };

    await expect(consumer.handlePushRequested(payload)).resolves.toEqual({
      status: 'accepted',
      description: 'queued',
    });
    expect(service.handlePushRequested).toHaveBeenCalledWith(payload);
  });

  it('parses string payloads emitted by BrokerConnectionBase', async () => {
    await consumer.handlePushRequested(
      JSON.stringify({ result_id: 77, result_code: '123', version_id: 2 }),
    );

    expect(service.handlePushRequested).toHaveBeenCalledWith({
      result_id: 77,
      result_code: '123',
      version_id: 2,
    });
  });

  it('rejects invalid string payloads', async () => {
    await expect(consumer.handlePushRequested('{')).rejects.toThrow(
      BadRequestException,
    );
  });
});
