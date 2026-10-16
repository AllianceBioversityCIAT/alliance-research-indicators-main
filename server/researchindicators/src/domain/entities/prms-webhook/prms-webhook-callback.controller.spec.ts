import { Request } from 'express';
import {
  allowlistedCallbackHeaders,
  PRMS_CALLBACK_RAW_HEADER_ALLOWLIST,
  PrmsWebhookCallbackController,
} from './prms-webhook-callback.controller';
import { PrmsWebhookDeliveryService } from './prms-webhook-delivery.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// carried gate 2 (raw_headers allowlist) · Swagger without bearer auth.

describe('allowlistedCallbackHeaders', () => {
  it('keeps only the named allowlist and drops credential-shaped headers', () => {
    const headers = allowlistedCallbackHeaders({
      'x-prms-delivery-id': '4172',
      'content-type': 'application/json',
      'user-agent': 'prms-test',
      authorization: 'Bearer credential-shaped',
      'x-api-key': 'credential-shaped-key',
      cookie: 'session=credential-shaped-cookie',
      'x-prms-signature': 'credential-shaped-signature',
    });

    expect(headers).toEqual({
      'x-prms-delivery-id': '4172',
      'content-type': 'application/json',
      'user-agent': 'prms-test',
    });
    expect(JSON.stringify(headers)).not.toContain('credential-shaped');
    expect(PRMS_CALLBACK_RAW_HEADER_ALLOWLIST).not.toContain('authorization');
  });
});

describe('PrmsWebhookCallbackController', () => {
  const accept = jest.fn().mockResolvedValue({
    status: 200,
    description: 'PRMS delivery stored',
    data: { received: true },
  });
  const controller = new PrmsWebhookCallbackController({
    accept,
  } as unknown as PrmsWebhookDeliveryService);

  beforeEach(() => {
    accept.mockClear();
  });

  it('delegates the allowlisted headers and never the raw header map', async () => {
    const req = {
      headers: {
        'x-prms-delivery-id': '4172',
        'content-type': 'application/json',
        authorization: 'Bearer credential-shaped',
        'x-api-key': 'credential-shaped-key',
      },
    } as unknown as Request;

    await controller.accept(req, { decision: 'NOPE' });

    expect(accept).toHaveBeenCalledWith({
      deliveryId: '4172',
      body: { decision: 'NOPE' },
      rawHeaders: {
        'x-prms-delivery-id': '4172',
        'content-type': 'application/json',
      },
    });
    const handed = accept.mock.calls[0][0].rawHeaders as Record<
      string,
      unknown
    >;
    expect(handed).not.toHaveProperty('authorization');
    expect(handed).not.toHaveProperty('x-api-key');
    expect(JSON.stringify(handed)).not.toContain('credential-shaped');
  });

  it('passes a missing delivery id as null', async () => {
    const req = { headers: {} } as unknown as Request;
    await controller.accept(req, null);
    expect(accept).toHaveBeenCalledWith({
      deliveryId: null,
      body: null,
      rawHeaders: {},
    });
  });

  it('declares Swagger tags and a placeholder secret, and no bearer auth', () => {
    expect(
      Reflect.getMetadata('swagger/apiUseTags', PrmsWebhookCallbackController),
    ).toEqual(['PRMS Webhook Callback']);
    expect(
      Reflect.getMetadata('swagger/apiSecurity', PrmsWebhookCallbackController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        'swagger/apiSecurity',
        PrmsWebhookCallbackController.prototype.accept,
      ),
    ).toBeUndefined();

    const params = Reflect.getMetadata(
      'swagger/apiParameters',
      PrmsWebhookCallbackController.prototype.accept,
    );
    const serialized = JSON.stringify(params);
    expect(serialized).toContain('<ARI_PRMS_WEBHOOK_SECRET>');
    expect(serialized).not.toContain('configured-secret');
  });
});
