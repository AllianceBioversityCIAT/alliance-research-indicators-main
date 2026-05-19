import { AppMicroserviceModule } from './app-microservice.module';
import { BilateralPushModule } from './domain/tools/bilateral-push/bilateral-push.module';

describe('AppMicroserviceModule', () => {
  it('registers the bilateral push skeleton module', () => {
    const imports = Reflect.getMetadata('imports', AppMicroserviceModule);

    expect(imports).toEqual(expect.arrayContaining([BilateralPushModule]));
  });
});
