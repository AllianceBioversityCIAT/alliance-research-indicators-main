export interface PrmsNormalizerRequestDto {
  tenant: string;
  op: string;
  results: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
}

export interface PrmsNormalizerResponseBodyDto {
  requestId?: string;
  rejected?: unknown[];
  results?: unknown[];
  [key: string]: unknown;
}

/**
 * HTTP metadata is retained alongside the verbatim Normalizer body so the
 * orchestration layer can distinguish a PRMS response from transport failure.
 */
export interface PrmsNormalizerTransportResponseDto {
  status: number;
  body: PrmsNormalizerResponseBodyDto;
}
