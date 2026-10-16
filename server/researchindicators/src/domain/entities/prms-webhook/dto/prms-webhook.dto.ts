import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03 /
// R-PWH-001, R-PWH-002. Swagger response shapes for the registration
// surface (`POST`/`GET /api/prms-webhook`). Class-based, distinct from the
// plain interfaces `PrmsNormalizerService` consumes at
// `tools/prms-normalizer/dto/prms-webhook.dto.ts` (T-02) — these exist so
// `@ApiResponse({ type })` has a real Swagger schema to render.

/** Destination object PRMS stores for the platform ([WH] Response Examples). */
export class PrmsWebhookDestinationResponseDto {
  @ApiProperty({ description: 'Internal id of the stored destination.' })
  id: number;

  @ApiProperty({
    description: 'Always "PLATFORM" for API-key registrations.',
  })
  recipient_type: string;

  @ApiProperty({
    description: "Your platform's CLARISA MIS id — resolved from the key.",
  })
  recipient_id: number;

  @ApiProperty({ type: String, nullable: true })
  recipient_acronym: string | null;

  @ApiProperty({ description: 'The destination now on file, normalized.' })
  url: string;

  @ApiProperty({
    description: 'true while the destination receives callbacks.',
  })
  is_active: boolean;

  @ApiProperty({ description: 'When it was last registered or changed.' })
  last_updated_date: string;
}

/** `data` shape for `POST /api/prms-webhook` (R-PWH-001). */
export class PrmsWebhookRegisterResponseDto {
  @ApiProperty({ type: () => PrmsWebhookDestinationResponseDto })
  destination: PrmsWebhookDestinationResponseDto;

  @ApiProperty({ description: "PRMS's human-readable outcome, verbatim." })
  message: string;

  @ApiPropertyOptional({
    description: 'AWS trace id — quote it when reporting a problem.',
  })
  requestId?: string;
}

/** `data` shape for `GET /api/prms-webhook` (R-PWH-002). */
export class PrmsWebhookReadResponseDto {
  @ApiProperty({
    description:
      'Derived from the emptiness of the PRMS response, never the HTTP status.',
  })
  registered: boolean;

  @ApiProperty({
    type: () => PrmsWebhookDestinationResponseDto,
    nullable: true,
  })
  destination: PrmsWebhookDestinationResponseDto | null;

  @ApiProperty({ description: "PRMS's human-readable outcome, verbatim." })
  message: string;

  @ApiPropertyOptional({
    description: 'AWS trace id — quote it when reporting a problem.',
  })
  requestId?: string;
}
