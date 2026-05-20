import { BilateralPushConnection } from './bilateral-push.connection';
import { BilateralPushConsumer } from './bilateral-push.consumer';
import { BilateralPushModule } from './bilateral-push.module';
import { BilateralPushService } from './bilateral-push.service';

describe('BilateralPushModule', () => {
  it('declares the skeleton consumer and providers', () => {
    const controllers = Reflect.getMetadata('controllers', BilateralPushModule);
    const providers = Reflect.getMetadata('providers', BilateralPushModule);
    const moduleExports = Reflect.getMetadata('exports', BilateralPushModule);

    expect(controllers).toEqual(
      expect.arrayContaining([BilateralPushConsumer]),
    );
    expect(providers).toEqual(
      expect.arrayContaining([BilateralPushConnection, BilateralPushService]),
    );
    expect(moduleExports).toEqual(
      expect.arrayContaining([BilateralPushConnection, BilateralPushService]),
    );
  });
});
