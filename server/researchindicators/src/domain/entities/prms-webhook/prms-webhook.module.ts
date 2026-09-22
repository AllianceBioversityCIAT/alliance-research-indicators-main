import { Module } from '@nestjs/common';
import { PrmsNormalizerModule } from '../../tools/prms-normalizer/prms-normalizer.module';
import { PrmsWebhookRegistrationController } from './prms-webhook-registration.controller';
import { PrmsWebhookRegistrationService } from './prms-webhook-registration.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03.
// Registers the SYSTEM_ADMIN registration surface only. The public callback
// controller (`prms-webhook-callback.controller.ts`) is a later task in
// this same child (T-04) and is NOT part of this module yet.
@Module({
  imports: [PrmsNormalizerModule],
  controllers: [PrmsWebhookRegistrationController],
  providers: [PrmsWebhookRegistrationService],
})
export class PrmsWebhookModule {}
