import { HttpAdapterHost } from '@nestjs/core';
import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { DeliveryCorrelatorService } from './delivery-correlator.service';
import { CallbackSecretGuard } from './guards/callback-secret.guard';
import { installLenientPrmsCallbackJsonParser } from './lenient-callback-json';
import { PrmsWebhookCallbackController } from './prms-webhook-callback.controller';
import { PrmsWebhookDeliveryService } from './prms-webhook-delivery.service';
import { PrmsWebhookDeliveryRepository } from './repositories/prms-webhook-delivery.repository';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04.
// Own module, not a second controller on PrmsWebhookModule.
// RouterModule.register stamps one MODULE_PATH per module class
// (Reflect.defineMetadata). Two main.routes entries on the same class
// cannot yield the disjoint prefixes DD-3 requires.

@Injectable()
export class PrmsCallbackLenientJson implements OnModuleInit {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onModuleInit(): void {
    const expressApp = this.httpAdapterHost.httpAdapter?.getInstance();
    if (!expressApp) {
      return;
    }
    const wrapped = installLenientPrmsCallbackJsonParser(expressApp as object);
    if (wrapped === 0) {
      throw new Error(
        'Prms callback lenient JSON parser was not installed: no jsonParser layer was mounted yet',
      );
    }
  }
}

@Module({
  controllers: [PrmsWebhookCallbackController],
  providers: [
    CallbackSecretGuard,
    PrmsWebhookDeliveryService,
    PrmsWebhookDeliveryRepository,
    DeliveryCorrelatorService,
    PrmsCallbackLenientJson,
  ],
})
export class PrmsWebhookCallbackModule {}
