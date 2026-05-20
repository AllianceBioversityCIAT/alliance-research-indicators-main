import { NotImplementedException } from '@nestjs/common';
import { BilateralPushService } from './bilateral-push.service';

describe('BilateralPushService', () => {
  const previousFlag = process.env.ARI_BILATERAL_PUSH_ENABLED;

  afterEach(() => {
    process.env.ARI_BILATERAL_PUSH_ENABLED = previousFlag;
    jest.restoreAllMocks();
  });

  it('skips requested pushes when the feature flag is disabled', async () => {
    process.env.ARI_BILATERAL_PUSH_ENABLED = 'false';
    const service = new BilateralPushService();

    await expect(
      service.handlePushRequested({
        result_id: 77,
        result_code: '123',
        version_id: 2,
      }),
    ).resolves.toEqual({
      status: 'skipped',
      description: 'Bilateral push feature flag is disabled',
    });
  });

  it('delegates requested pushes to execute when the feature flag is enabled', async () => {
    process.env.ARI_BILATERAL_PUSH_ENABLED = 'true';
    const service = new BilateralPushService();
    const execute = jest.spyOn(service, 'execute').mockResolvedValue({
      status: 'accepted',
      description: 'accepted',
    });
    const message = { result_id: 77, result_code: '123', version_id: 2 };

    await expect(service.handlePushRequested(message)).resolves.toEqual({
      status: 'accepted',
      description: 'accepted',
    });
    expect(execute).toHaveBeenCalledWith(message);
  });

  it('keeps real execution deferred to T-26', async () => {
    const service = new BilateralPushService();

    await expect(
      service.execute({ result_id: 77, result_code: '123', version_id: 2 }),
    ).rejects.toThrow(NotImplementedException);
  });
});
