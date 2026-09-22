import 'reflect-metadata';
import { PrmsWebhookRegistrationController } from './prms-webhook-registration.controller';
import { PrmsWebhookModule } from './prms-webhook.module';
import { PrmsWebhookRegistrationService } from './prms-webhook-registration.service';
import { PrmsNormalizerModule } from '../../tools/prms-normalizer/prms-normalizer.module';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03.
describe('PrmsWebhookModule', () => {
  it('declares the registration controller and service', () => {
    const controllers: unknown[] = Reflect.getMetadata(
      'controllers',
      PrmsWebhookModule,
    );
    const providers: unknown[] = Reflect.getMetadata(
      'providers',
      PrmsWebhookModule,
    );

    expect(controllers).toContain(PrmsWebhookRegistrationController);
    expect(providers).toContain(PrmsWebhookRegistrationService);
  });

  it('imports PrmsNormalizerModule', () => {
    const imports: unknown[] = Reflect.getMetadata(
      'imports',
      PrmsWebhookModule,
    );

    expect(imports).toContain(PrmsNormalizerModule);
  });
});
