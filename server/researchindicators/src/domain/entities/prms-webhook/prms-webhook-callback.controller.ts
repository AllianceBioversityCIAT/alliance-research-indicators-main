import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IncomingHttpHeaders } from 'http';
import { CallbackSecretGuard } from './guards/callback-secret.guard';
import { PrmsWebhookDeliveryService } from './prms-webhook-delivery.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// R-PWH-003 (HTTP edge) · NFR-PWH-002 carried gate 2 · design §5.
// No @ApiBearerAuth: this route takes no token. The secret is a
// placeholder in Swagger, never a real value.

/**
 * Headers stored on the delivery row. Anything else — `authorization`,
 * `cookie`, `x-api-key`, `x-prms-signature` — is a credential-shaped
 * channel and must not be handed to T-09, which stores this object
 * as-is (NFR-PWH-002). The path secret is not a header.
 */
export const PRMS_CALLBACK_RAW_HEADER_ALLOWLIST = [
  'x-prms-delivery-id',
  'content-type',
  'user-agent',
] as const;

export function allowlistedCallbackHeaders(
  headers: IncomingHttpHeaders,
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const name of PRMS_CALLBACK_RAW_HEADER_ALLOWLIST) {
    if (headers[name] !== undefined) {
      picked[name] = headers[name];
    }
  }
  return picked;
}

function readDeliveryId(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string' || first.length === 0) {
    return null;
  }
  return first;
}

@ApiTags('PRMS Webhook Callback')
@UseGuards(CallbackSecretGuard)
@Controller()
export class PrmsWebhookCallbackController {
  constructor(private readonly delivery: PrmsWebhookDeliveryService) {}

  @Post(':secret')
  @ApiOperation({
    summary:
      'Accept a PRMS decision delivery. Authenticated by the path secret only; a wrong or unset secret is 404.',
  })
  @ApiParam({
    name: 'secret',
    description:
      'Shared path secret from ARI_PRMS_WEBHOOK_SECRET. The example is a placeholder, never a real value.',
    example: '<ARI_PRMS_WEBHOOK_SECRET>',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Delivery stored. Malformed and unparseable bodies are still 2xx.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Secret missing, wrong, or ARI_PRMS_WEBHOOK_SECRET unset',
  })
  accept(@Req() req: Request, @Body() body: unknown) {
    return this.delivery.accept({
      deliveryId: readDeliveryId(req.headers['x-prms-delivery-id']),
      body,
      rawHeaders: allowlistedCallbackHeaders(req.headers),
    });
  }
}
