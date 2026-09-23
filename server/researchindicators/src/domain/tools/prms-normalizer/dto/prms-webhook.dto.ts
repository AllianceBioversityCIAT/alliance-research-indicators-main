/**
 * Outbound body for `POST /webhook`.
 * [WH] §1: "No other properties are accepted."
 */
export interface PrmsWebhookRegisterRequestDto {
  url: string;
}

/** Destination object PRMS stores for the platform ([WH] Response Examples). */
export interface PrmsWebhookDestinationDto {
  id: number;
  recipient_type: string;
  recipient_id: number;
  recipient_acronym: string | null;
  url: string;
  is_active: boolean;
  last_updated_date: string;
}

/**
 * Envelope PRMS returns from `POST /webhook` and `GET /webhook`.
 * `response` is `{}` when nothing is registered — HTTP 200, not an error.
 */
export interface PrmsWebhookApiResponseDto {
  ok?: boolean;
  response?: PrmsWebhookDestinationDto | Record<string, never>;
  statusCode?: number;
  message?: string;
  timestamp?: string;
  path?: string;
  requestId?: string;
  error?: string;
}

/** What `registerWebhook` returns to its caller on a 2xx from PRMS. */
export interface PrmsWebhookRegistrationResultDto {
  destination: PrmsWebhookDestinationDto;
  message: string;
  requestId?: string;
}

/**
 * What `getWebhook` returns. `registered` is the emptiness of `response`,
 * never the HTTP status (R-PWH-002 AC.3).
 */
export interface PrmsWebhookReadResultDto {
  registered: boolean;
  destination: PrmsWebhookDestinationDto | null;
  message: string;
  requestId?: string;
}
