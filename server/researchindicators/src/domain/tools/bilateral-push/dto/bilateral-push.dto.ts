export interface BilateralPushRequestedMessage {
  result_id: number;
  result_code: string;
  version_id: number;
  requested_by?: number;
}

export interface BilateralPushQueueResponse {
  status: 'accepted' | 'skipped';
  description: string;
}

export interface BilateralPushConnectionResponse {
  prms_result_code?: number;
  raw?: unknown;
}
