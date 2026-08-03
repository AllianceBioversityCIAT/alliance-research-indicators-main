import { ConfigurationByKeyResponse } from './configuration-by-key.interface';

export function getBulkUploadEmbedUrl(data: ConfigurationByKeyResponse | null | undefined): string | null {
  const url = data?.simple_value;
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function appendAccessTokenToEmbedUrl(embedBaseUrl: string, accessToken: string): string {
  const u = new URL(embedBaseUrl);
  u.searchParams.set('access_token', accessToken);
  return u.toString();
}
