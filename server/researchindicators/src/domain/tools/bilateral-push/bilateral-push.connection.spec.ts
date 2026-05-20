import { NotImplementedException } from '@nestjs/common';
import { BilateralPushConnection } from './bilateral-push.connection';

describe('BilateralPushConnection', () => {
  it('keeps real PRMS transport deferred until auth/error contracts are resolved', async () => {
    const connection = new BilateralPushConnection();

    await expect(connection.send({}, 'key')).rejects.toThrow(
      NotImplementedException,
    );
  });
});
