import { Module } from '@nestjs/common';
import { PrmsNormalizerModule } from '../../tools/prms-normalizer/prms-normalizer.module';
import { PrmsWebhookCallbackModule } from './prms-webhook-callback.module';
import { PrmsWebhookRegistrationController } from './prms-webhook-registration.controller';
import { PrmsWebhookRegistrationService } from './prms-webhook-registration.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03, T-04.
// Registration controllers stay on this module (`prms-webhook`). The
// public callback is a separate module imported here so the container
// instantiates it; its route prefix is its own MODULE_PATH (T-04).
// One class cannot carry both prefixes.
@Module({
  imports: [PrmsNormalizerModule, PrmsWebhookCallbackModule],
  controllers: [PrmsWebhookRegistrationController],
  providers: [PrmsWebhookRegistrationService],
})
export class PrmsWebhookModule {}
